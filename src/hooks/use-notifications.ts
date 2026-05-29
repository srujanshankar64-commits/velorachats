import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number, gain = 0.35) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(1318, now, 0.18);
    playTone(1567, now + 0.13, 0.25);
  } catch {}
}

let tabBadgeCount = 0;
let originalTitle = "";
function incrementTabBadge() {
  if (document.visibilityState === "visible") return;
  if (tabBadgeCount === 0) originalTitle = document.title.replace(/^\(\d+\)\s/, "");
  tabBadgeCount++;
  document.title = `(${tabBadgeCount}) ${originalTitle}`;
}
function clearTabBadge() {
  tabBadgeCount = 0;
  if (originalTitle) document.title = originalTitle;
}

export interface NotifyPayload {
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  message: string;
  chatUserId: string;
}

interface UseNotificationsOptions {
  currentUserId: string | null | undefined;
  activeChatUserId?: string | null;
}

export function useNotifications({ currentUserId, activeChatUserId }: UseNotificationsOptions) {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") { permissionRef.current = "granted"; return; }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => { permissionRef.current = p; });
    }
  }, []);

  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") clearTabBadge(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const notify = useCallback(({ senderId, senderName, senderAvatar, message, chatUserId }: NotifyPayload) => {
    const key = `${senderId}:${message}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    setTimeout(() => { lastKeyRef.current = null; }, 3000);
    if (!currentUserId || senderId === currentUserId) return;
    const chatIsOpen = activeChatUserId === chatUserId;
    const tabFocused = document.visibilityState === "visible";
    if (chatIsOpen && tabFocused) return;
    playNotificationSound();
    incrementTabBadge();
    if (permissionRef.current === "granted") {
      const body = message.length > 60 ? message.slice(0, 57) + "..." : message;
      const notif = new Notification(senderName || "New message", {
        body,
        icon: senderAvatar || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `dm-${chatUserId}`,
        renotify: true,
        silent: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
        window.dispatchEvent(new CustomEvent("velora:openChat", { detail: { chatUserId } }));
      };
      setTimeout(() => notif.close(), 5000);
    }
  }, [currentUserId, activeChatUserId]);

  return { notify };
}

export function useGlobalDMListener({ currentUserId, activeChatUserId }: UseNotificationsOptions) {
  const { notify } = useNotifications({ currentUserId, activeChatUserId });

  useEffect(() => {
    if (!currentUserId) return;

    // Step 1: get all room IDs where current user is user_a or user_b
    const setupListener = async () => {
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
        .eq("type", "dm");

      if (!rooms || rooms.length === 0) return;

      const roomIds = rooms.map((r: any) => r.id);

      // Build a map: roomId -> other user's ID
      const roomToOtherUser: Record<string, string> = {};
      rooms.forEach((r: any) => {
        roomToOtherUser[r.id] = r.user_a === currentUserId ? r.user_b : r.user_a;
      });

      // Step 2: listen for new messages in those rooms
      const channel = supabase
        .channel(`dm-notifications:${currentUserId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
        }, async (payload) => {
          const msg = payload.new as any;

          // Only care about messages in our DM rooms from someone else
          if (!roomIds.includes(msg.room_id)) return;
          if (msg.sender_id === currentUserId) return;

          const otherUserId = roomToOtherUser[msg.room_id];

          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, username")
            .eq("id", msg.sender_id)
            .single();

          notify({
            senderId: msg.sender_id,
            senderName: profile?.full_name || profile?.username || "Someone",
            senderAvatar: profile?.avatar_url ?? null,
            message: msg.content || "",
            chatUserId: otherUserId || msg.sender_id,
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let cleanup: (() => void) | undefined;
    setupListener().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [currentUserId, notify]);
}
