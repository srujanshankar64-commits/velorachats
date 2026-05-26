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

// --- Notification sound using Web Audio API (no CDN, always works) ---
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const play = (freq: number, startTime: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };
    // Two-tone ping like WhatsApp / chatib
    play(880, 0, 0.12, 0.35);
    play(1100, 0.13, 0.18, 0.25);
  } catch (_) {}
}

// --- Browser push notification (shows when tab is minimised / in background) ---
function showBrowserNotification(title: string, body: string, tag: string, onClick: () => void) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return; // Only when tab is not focused
  const n = new Notification(title, { body, tag, icon: "/favicon.ico", badge: "/favicon.ico", requireInteraction: false });
  n.onclick = () => { window.focus(); onClick(); n.close(); };
}

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  const roomMapRef = useRef<Map<string, string>>(new Map());
  const nameCache = useRef<Map<string, string>>(new Map());

  // Request browser notification permission once on login
  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // Periodically run cleanup_old_messages (every 30s)
  useEffect(() => {
    if (!user) return;
    const runCleanup = async () => {
      try { await supabase.rpc("cleanup_old_messages"); } catch (_) {}
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

    // Get sender name (cached to avoid repeated fetches)
    const getSenderName = async (otherId: string): Promise<string> => {
      if (nameCache.current.has(otherId)) return nameCache.current.get(otherId)!;
      const { data } = await supabase.from("profiles").select("username").eq("id", otherId).single();
      const name = data?.username || "Someone";
      nameCache.current.set(otherId, name);
      return name;
    };

    const triggerNotification = async (otherId: string, m: { content: string }) => {
      const isViewing = typeof window !== "undefined" && window.location.pathname === `/messages/${otherId}`;

      // Always play sound (even when in the chat, like WhatsApp)
      playNotificationSound();

      if (!isViewing) {
        setUnread((u) => ({ ...u, [otherId]: (u[otherId] ?? 0) + 1 }));
      }

      const name = await getSenderName(otherId);
      const preview = m.content.length > 80 ? m.content.substring(0, 80) + "…" : m.content;

      // Browser push notification when tab is hidden/minimised
      showBrowserNotification(
        `💬 ${name}`,
        preview,
        `msg-${otherId}`,
        () => { window.location.href = `/messages/${otherId}`; }
      );

      if (!isViewing) {
        // Sonner toast with sender + preview + Reply button
        toast(`💬 ${name}`, {
          description: preview,
          duration: 5000,
          action: {
            label: "Reply",
            onClick: () => { window.location.href = `/messages/${otherId}`; },
          },
        });
      }
    };

    const ch = supabase
      .channel(`unread:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { room_id: string; sender_id: string; content: string };
        if (m.sender_id === me) return;
        const otherId = roomMapRef.current.get(m.room_id);
        if (!otherId) {
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
