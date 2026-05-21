import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type RoomInfo = { roomId: string; otherId: string };

interface UnreadCtx {
  /** Map<otherUserId, unreadCount> */
  unread: Record<string, number>;
  /** Total unread across all conversations */
  total: number;
  /** Mark a DM (by the OTHER user id) as read now */
  markRead: (otherUserId: string) => Promise<void>;
}

const Ctx = createContext<UnreadCtx>({ unread: {}, total: 0, markRead: async () => {} });

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  // roomId -> otherId map, kept in a ref so the realtime listener stays cheap
  const roomMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) {
      setUnread({});
      roomMapRef.current = new Map();
      return;
    }
    let active = true;
    const me = user.id;

    (async () => {
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id,user_a,user_b")
        .eq("type", "dm")
        .or(`user_a.eq.${me},user_b.eq.${me}`);

      const list: RoomInfo[] = (rooms ?? []).map((r) => ({
        roomId: r.id,
        otherId: r.user_a === me ? r.user_b : r.user_a,
      }));
      const map = new Map<string, string>();
      list.forEach((r) => map.set(r.roomId, r.otherId));
      roomMapRef.current = map;

      if (list.length === 0) {
        if (active) setUnread({});
        return;
      }

      const { data: reads } = await supabase
        .from("room_reads")
        .select("room_id,last_read_at")
        .eq("user_id", me);
      const readMap = new Map((reads ?? []).map((r) => [r.room_id, r.last_read_at as string]));

      const counts: Record<string, number> = {};
      // Count unread messages per room (parallel small queries)
      await Promise.all(list.map(async (r) => {
        const since = readMap.get(r.roomId) ?? "1970-01-01";
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", r.roomId)
          .neq("sender_id", me)
          .gt("created_at", since);
        if (count && count > 0) counts[r.otherId] = count;
      }));
      if (active) setUnread(counts);
    })();

    // Realtime: increment when a new message arrives in any of my rooms
    const ch = supabase
      .channel(`unread:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { room_id: string; sender_id: string };
        if (m.sender_id === me) return;
        const otherId = roomMapRef.current.get(m.room_id);
        if (!otherId) return;
        // Skip if user is actively viewing this DM
        if (typeof window !== "undefined" && window.location.pathname === `/messages/${otherId}`) return;
        setUnread((u) => ({ ...u, [otherId]: (u[otherId] ?? 0) + 1 }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_rooms", filter: `user_b=eq.${me}` }, (payload) => {
        const r = payload.new as { id: string; user_a: string; user_b: string; type: string };
        if (r.type === "dm") roomMapRef.current.set(r.id, r.user_a);
      })
      .subscribe();

    return () => { active = false; ch.unsubscribe(); };
  }, [user]);

  const markRead = useCallback(async (otherUserId: string) => {
    if (!user) return;
    let roomId: string | undefined;
    for (const [rid, oid] of roomMapRef.current.entries()) if (oid === otherUserId) { roomId = rid; break; }
    if (!roomId) {
      const { data } = await supabase.rpc("get_or_create_dm", { target: otherUserId });
      roomId = data as string;
      if (roomId) roomMapRef.current.set(roomId, otherUserId);
    }
    if (!roomId) return;
    await supabase.from("room_reads").upsert({ user_id: user.id, room_id: roomId, last_read_at: new Date().toISOString() });
    setUnread((u) => {
      if (!u[otherUserId]) return u;
      const next = { ...u }; delete next[otherUserId]; return next;
    });
  }, [user]);

  const total = Object.values(unread).reduce((a, b) => a + b, 0);
  return <Ctx.Provider value={{ unread, total, markRead }}>{children}</Ctx.Provider>;
}

export const useUnread = () => useContext(Ctx);
