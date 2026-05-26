import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

  // Periodically run cleanup_old_messages (e.g. every 30s)
  useEffect(() => {
    if (!user) return;
    const runCleanup = async () => {
      try {
        await supabase.rpc("cleanup_old_messages");
      } catch (e) {
        console.error("Failed to run cleanup_old_messages rpc:", e);
      }
    };
    
    runCleanup();
    const interval = setInterval(runCleanup, 30000);
    return () => clearInterval(interval);
  }, [user]);

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

    const triggerNotification = (otherId: string, m: any) => {
      const isViewing = typeof window !== "undefined" && window.location.pathname === `/messages/${otherId}`;
      
      // Play audio notification sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav");
        audio.play().catch((e) => console.log("Audio play error:", e));
      } catch (e) {
        console.error("Audio error:", e);
      }

      if (isViewing) return;

      setUnread((u) => ({ ...u, [otherId]: (u[otherId] ?? 0) + 1 }));

      // Show Toast notification like Chatib
      supabase
        .from("profiles")
        .select("username")
        .eq("id", otherId)
        .single()
        .then(({ data }) => {
          const name = data?.username || "Someone";
          toast.info(`Message from ${name}`, {
            description: m.content.length > 60 ? m.content.substring(0, 60) + "..." : m.content,
            action: {
              label: "Chat",
              onClick: () => {
                window.location.href = `/messages/${otherId}`;
              },
            },
          });
        });
    };

    const ch = supabase
      .channel(`unread:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { room_id: string; sender_id: string; content: string };
        if (m.sender_id === me) return;
        
        const otherId = roomMapRef.current.get(m.room_id);
        if (!otherId) {
          // Fetch room mapping dynamically
          supabase
            .from("chat_rooms")
            .select("id,user_a,user_b")
            .eq("id", m.room_id)
            .single()
            .then(({ data }) => {
              if (data) {
                const oid = data.user_a === me ? data.user_b : data.user_a;
                roomMapRef.current.set(data.id, oid);
                triggerNotification(oid, m);
              }
            });
        } else {
          triggerNotification(otherId, m);
        }
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
