import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({
    meta: [
      { title: "Chat — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DMChat,
});

type Msg = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  delivered_at?: string | null;
  status?: string;
  _local?: boolean;
};
type Other = { id: string; username: string; name: string | null; is_online: boolean };

const CRISIS_RE = /\b(suicide|kill myself|end it|hurt myself|want to die)\b/i;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function DMChat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const { markRead, total: unreadTotal } = useUnread();
  const nav = useNavigate();
  const goBack = useCallback(() => nav({ to: "/messages" }), [nav]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [crisis, setCrisis] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const inset = useKeyboardInset();
  useSwipeBack(goBack);

  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ShhChats` : "ShhChats";
    return () => { document.title = "ShhChats"; };
  }, [unreadTotal]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prof }, { data: rid, error }] = await Promise.all([
        supabase.from("profiles").select("id,username,name,is_online").eq("id", userId).single(),
        supabase.rpc("get_or_create_dm", { target: userId }),
      ]);
      if (!active) return;
      if (prof) setOther(prof as Other);
      if (error) return toast.error(error.message);
      setRoomId(rid as string);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id,sender_id,content,created_at,read_at,delivered_at,status")
        .eq("room_id", rid as string)
        .order("created_at")
        .limit(100);
      if (!active) return;
      if (msgs) setMessages(msgs as Msg[]);
      markRead(userId);

      // Mark all received messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("room_id", rid as string)
        .neq("sender_id", user.id)
        .is("read_at", null);
    })();
    return () => { active = false; };
  }, [userId, user, markRead]);

  // Real-time: messages + typing + online status
  useEffect(() => {
    if (!roomId || !user) return;

    // 1. Typing channel — broadcast only
    const typingCh = supabase
      .channel(`typing:${roomId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { from: string; typing: boolean };
        if (p.from === userId) {
          setOtherTyping(p.typing);
          if (p.typing) window.setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();

    typingChRef.current = typingCh;

    // 2. Messages DB channel — postgres_changes only
    const msgCh = supabase
      .channel(`messages:${roomId}`)

    // Online status: live subscription on profiles table
    const onlineCh = supabase
      .channel(`presence:${userId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as { is_online: boolean };
          setOther((prev) => prev ? { ...prev, is_online: updated.is_online } : prev);
        })
      .subscribe();

    // Mark user as online
    if (user) {
      supabase.from("profiles").update({ is_online: true, last_seen: new Date().toISOString() }).eq("id", user.id).then(() => {});
    }

    // Mark offline on tab close
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", user.id).then(() => {});
      } else {
        supabase.from("profiles").update({ is_online: true }).eq("id", user.id).then(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      typingCh.unsubscribe();
      typingCh.unsubscribe();
      msgCh.unsubscribe();
      onlineCh.unsubscribe();
      typingChRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [roomId, user, userId, markRead]);

  // Auto scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  function broadcastTyping(typing: boolean) {
    const ch = typingChRef.current;
    if (!ch || !user) return;
    ch.send({ type: "broadcast", event: "typing", payload: { from: user.id, typing } });
  }

  function onInputChange(v: string) {
    setInput(v);
    broadcastTyping(true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => broadcastTyping(false), 1500);
  }

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    broadcastTyping(false);
    if (CRISIS_RE.test(text)) setCrisis(true);

    const tempId = "local-" + Date.now();
    const optimistic: Msg = {
      id: tempId, sender_id: user.id, content: text,
      created_at: new Date().toISOString(), status: "sending", _local: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, sender_id: user.id, content: text })
      .select("id,sender_id,content,created_at,read_at,delivered_at,status")
      .single();

    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      toast.error("Couldn't send");
    } else if (data) {
      // Replace optimistic message with real one immediately
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Msg) : m)));
    }
  }

  async function blockUser() {
    if (!user) return;
    await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
    toast.success("User blocked.");
    setMenuOpen(false);
    goBack();
  }

  async function reportUser(reason: string) {
    if (!user) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_id: userId, reason });
    toast.success("Report submitted.");
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const myLastSentId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id && !messages[i]._local) return messages[i].id;
    }
    return null;
  }, [messages, user?.id]);

  const displayName = other?.name || other?.username || "";

  return (
    <div className="flex flex-col h-[100dvh] warm-page" style={{ background: "#141008" }}>
      {/* Top bar */}
      <header
        className="h-[58px] shrink-0 px-3 flex items-center gap-3"
        style={{ background: "#1a1512", borderBottom: "0.5px solid #2e2618" }}
      >
        <button onClick={goBack} className="p-2 -ml-2" aria-label="Back" style={{ color: "#f0ebe4" }}>
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        {other && (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <UserAvatar id={other.id} name={displayName} online={other.is_online} size={36} onlineRingColor="#1a1512" />
            <div className="min-w-0 flex flex-col">
              <p className="text-[16px] font-semibold truncate warm-grad-text leading-tight">{displayName}</p>
              <p className="text-[11px]" style={{ color: other.is_online ? "#6dbf6a" : "#5e5040" }}>
                {other.is_online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        )}
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2" aria-label="More" style={{ color: "#f0ebe4" }}>
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin chat-scroll" style={{ paddingBottom: 16 }}>
        <div className="text-center my-3">
          <span
            className="inline-block px-3 py-1 text-[11px] italic rounded-full"
            style={{ background: "#201c14", color: "#8a7460", border: "0.5px solid #2e2618" }}
          >
            You're both up late. Say hello 🌙
          </span>
        </div>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.sender_id === user!.id} myLastSentId={myLastSentId} />
        ))}
        {crisis && (
          <div className="text-center my-3">
            <span
              className="inline-block px-3 py-1.5 text-[11px] rounded-full"
              style={{ background: "rgba(240,164,112,0.12)", color: "#f0a070", border: "0.5px solid rgba(240,164,112,0.20)" }}
            >
              💙 iCall: 9152987821 · Vandrevala: 1860-2662-345
            </span>
          </div>
        )}
        {otherTyping && (
          <div className="flex justify-start mb-1">
            <div className="rounded-[18px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1" style={{ background: "#201c14", border: "0.5px solid #2e2618" }}>
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-1" style={{ background: "#8a7460" }} />
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-2" style={{ background: "#8a7460" }} />
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-3" style={{ background: "#8a7460" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-3 py-2"
        style={{
          background: "#141008",
          borderTop: "0.5px solid #2e2618",
          paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)`,
          transform: inset ? `translateY(-${inset}px)` : undefined,
          transition: "transform 200ms ease",
        }}
      >
        <div className="flex items-end gap-2 pl-4 pr-1.5 py-1.5 min-h-[48px] rounded-[24px]" style={{ background: "#201c14", border: "0.5px solid #332a1c" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[16px] resize-none py-2 leading-5 max-h-[120px]"
            style={{ color: "#f5f0ea" }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#2a2318",
              opacity: input.trim() ? 1 : 0.6,
            }}
          >
            <ArrowUp className="h-5 w-5" style={{ color: input.trim() ? "#1a1410" : "#6e5e48" }} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom sheet menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setMenuOpen(false)}>
          <div
            className="w-full rounded-t-3xl p-4 fade-up"
            style={{ background: "#201c14", border: "0.5px solid #2e2618", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-10 rounded-full mx-auto mb-4" style={{ background: "#3e3222" }} />
            <button onClick={() => reportUser("Spam")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report spam</button>
            <button onClick={() => reportUser("Harassment")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report harassment</button>
            <button onClick={() => reportUser("Inappropriate")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report inappropriate</button>
            <button onClick={blockUser} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#F87171" }}>Block this person</button>
            <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-2 rounded-full text-sm" style={{ background: "#141008", color: "#f5f0ea" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const Bubble = memo(function Bubble({ m, mine, myLastSentId }: { m: Msg; mine: boolean; myLastSentId: string | null }) {
  const isMyLast = mine && myLastSentId === m.id;
  const failed = m.status === "failed";
  const sending = m._local && m.status === "sending";
  const seen = !!m.read_at;
  const delivered = !!m.delivered_at;

  return (
    <div className={`flex mb-1.5 ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        <div
          className="px-3.5 py-2.5 text-[15px] break-words"
          style={{
            background: mine ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#201c14",
            color: mine ? "#1a1410" : "#f5f0ea",
            border: mine ? "none" : "0.5px solid #2e2618",
            borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            opacity: sending ? 0.7 : 1,
          }}
        >
          {m.content}
        </div>
        <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "justify-end" : "justify-start"}`} style={{ color: "#5e5040" }}>
          <span>{fmtTime(m.created_at)}</span>
          {mine && isMyLast && (
            failed ? <span style={{ color: "#F87171" }}>failed</span>
            : sending ? <span style={{ color: "#5e5040" }}>sending…</span>
            : seen ? <span style={{ color: "#6dbf6a" }}>✓✓ seen</span>
            : delivered ? <span style={{ color: "#8a7460" }}>✓✓ delivered</span>
            : <span style={{ color: "#8a7460" }}>✓ sent</span>
          )}
        </div>
      </div>
    </div>
  );
});