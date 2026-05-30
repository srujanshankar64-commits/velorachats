import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type RoomInfo = { roomId: string; otherId: string };

interface UnreadCtx {
  unread: Record<string, number>;
  total: number;
  markRead: (otherUserId: string) => Promise<void>;
}

const Ctx = createContext<UnreadCtx>({ unread: {}, total: 0, markRead: async () => {} });

// ─── Audio: play notification.mp3 (Facebook-style sound in /public) ──────────
// Keep a single reusable Audio element to avoid creating new ones repeatedly
let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!_audio) {
    _audio = new Audio("/notify.mp3");
    _audio.volume = 0.7;
    _audio.preload = "auto";
  }
  return _audio;
}

/** Called on first user gesture to pre-load and unlock audio playback */
function unlockAudio() {
  const a = getAudio();
  if (!a) return;
  // A silent play+pause pre-loads the file and satisfies browser autoplay policy
  a.play().then(() => a.pause()).catch(() => {});
  a.currentTime = 0;
}

function playNotificationSound() {
  try {
    const a = getAudio();
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {
      // Fallback: Web Audio API two-tone ping if mp3 fails
      const Cls = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Cls) return;
      const ctx = new Cls();
      const tone = (freq: number, t0: number, dur: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + t0);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
        osc.start(ctx.currentTime + t0);
        osc.stop(ctx.currentTime + t0 + dur);
      };
      tone(880, 0, 0.14, 0.4);
      tone(1100, 0.15, 0.20, 0.28);
    });
  } catch (_) {}
}

// ─── Browser push notification ───────────────────────────────────────────────
function showBrowserNotification(title: string, body: string, tag: string, onClick: () => void) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Show when tab is hidden OR just show always for reliability
  const n = new Notification(title, {
    body,
    tag,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    requireInteraction: false,
  });
  n.onclick = () => { window.focus(); onClick(); n.close(); };
}

// ─── Component ───────────────────────────────────────────────────────────────
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  const roomMapRef  = useRef<Map<string, string>>(new Map());
  const nameCache   = useRef<Map<string, string>>(new Map());

  // Unlock AudioContext on first user gesture (required by Chrome autoplay policy)
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener("click",      unlock, { once: true });
    document.addEventListener("keydown",    unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click",      unlock);
      document.removeEventListener("keydown",    unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Ask for browser notification permission on user gesture (click), keeps listener active until permission is granted or denied
  useEffect(() => {
    if (!user) return;
    const ask = () => {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().then((perm) => {
            if (perm !== "default") {
              document.removeEventListener("click", ask);
            }
          });
        } else {
          document.removeEventListener("click", ask);
        }
      }
    };
    document.addEventListener("click", ask);
    return () => document.removeEventListener("click", ask);
  }, [user]);

  // Periodic message cleanup
  useEffect(() => {
    if (!user) return;
    const run = async () => { try { await supabase.rpc("cleanup_old_messages"); } catch (_) {} };
    run();
    const id = setInterval(run, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // Load unread counts + subscribe to new messages
  useEffect(() => {
    if (!user) { setUnread({}); roomMapRef.current = new Map(); return; }
    let active = true;
    const me = user.id;

    (async () => {
      const { data: rooms } = await supabase
        .from("chat_rooms").select("id,user_a,user_b")
        .eq("type", "dm").or(`user_a.eq.${me},user_b.eq.${me}`);

      const list: RoomInfo[] = (rooms ?? []).map((r) => ({
        roomId:  r.id,
        otherId: r.user_a === me ? r.user_b : r.user_a,
      }));
      const map = new Map<string, string>();
      list.forEach((r) => map.set(r.roomId, r.otherId));
      roomMapRef.current = map;

      if (!list.length) { if (active) setUnread({}); return; }

      const { data: reads } = await supabase
        .from("room_reads").select("room_id,last_read_at").eq("user_id", me);
      const readMap = new Map((reads ?? []).map((r) => [r.room_id, r.last_read_at as string]));

      const counts: Record<string, number> = {};
      await Promise.all(list.map(async (r) => {
        const since = readMap.get(r.roomId) ?? "1970-01-01";
        const { count } = await supabase.from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", r.roomId).neq("sender_id", me).gt("created_at", since);
        if (count && count > 0) counts[r.otherId] = count;
      }));
      if (active) setUnread(counts);
    })();

    const getSenderName = async (id: string) => {
      if (nameCache.current.has(id)) return nameCache.current.get(id)!;
      const { data } = await supabase.from("profiles").select("username").eq("id", id).single();
      const name = data?.username || "Someone";
      nameCache.current.set(id, name);
      return name;
    };

    const triggerNotification = async (otherId: string, m: { content: string }) => {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isViewing = path === `/messages/${otherId}`;

      // Play sound always (user must have clicked once to unlock AudioContext)
      playNotificationSound();

      if (!isViewing) {
        setUnread((u) => ({ ...u, [otherId]: (u[otherId] ?? 0) + 1 }));
      }

      const name    = await getSenderName(otherId);
      const preview = m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content;

      // Browser push notification (works when tab is minimised / hidden)
      showBrowserNotification(`💬 ${name}`, preview, `msg-${otherId}`,
        () => { window.location.href = `/messages/${otherId}`; });

      if (!isViewing) {
        toast(`💬 ${name}`, {
          description: preview,
          duration: 6000,
          action: { label: "Reply", onClick: () => { window.location.href = `/messages/${otherId}`; } },
        });
      }
    };

    const ch = supabase.channel(`unread:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { room_id: string; sender_id: string; content: string };
        if (m.sender_id === me) return;
        const otherId = roomMapRef.current.get(m.room_id);
        if (!otherId) {
          supabase.from("chat_rooms").select("id,user_a,user_b").eq("id", m.room_id).single()
            .then(({ data }) => {
              if (data) {
                const oid = data.user_a === me ? data.user_b : data.user_a;
                roomMapRef.current.set(data.id, oid);
                triggerNotification(oid, m); if (typeof (window as any).playChatAlert === 'function') { (window as any).playChatAlert(m.sender_id, m.content); }
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
    setUnread((u) => { if (!u[otherUserId]) return u; const n = { ...u }; delete n[otherUserId]; return n; });
  }, [user]);

  const total = Object.values(unread).reduce((a, b) => a + b, 0);
  return <Ctx.Provider value={{ unread, total, markRead }}>{children}</Ctx.Provider>;
}

export const useUnread = () => useContext(Ctx);
