import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, MoreHorizontal, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — Velora" }] }),
  component: DMChat,
});

type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Other = { id: string; username: string; avatar_url: string | null; is_online: boolean };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function DMChat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const { markRead } = useUnread();
  const nav = useNavigate();
  const goBack = useCallback(() => nav({ to: "/messages" }), [nav]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const inset = useKeyboardInset();
  useSwipeBack(goBack);

  // Load room + profile
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prof }, { data: rid, error }] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url,is_online").eq("id", userId).single(),
        supabase.rpc("get_or_create_dm", { target: userId }),
      ]);
      if (!active) return;
      if (prof) setOther(prof as Other);
      if (error) return toast.error(error.message);
      setRoomId(rid as string);
      const [{ data: msgs }, { data: readRow }] = await Promise.all([
        supabase.from("messages").select("*").eq("room_id", rid as string).order("created_at").limit(60),
        supabase.from("room_reads").select("last_read_at").eq("room_id", rid as string).eq("user_id", userId).maybeSingle(),
      ]);
      if (!active) return;
      if (msgs) setMessages(msgs as Msg[]);
      setOtherLastRead(readRow?.last_read_at ?? null);
      markRead(userId);
    })();
    return () => { active = false; };
  }, [userId, user, markRead]);

  // Realtime messages + reads + typing
  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase.channel(`dm:${roomId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id !== user.id) markRead(userId);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_reads", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string };
          if (row.user_id === userId) setOtherLastRead(row.last_read_at);
        })
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { from: string; typing: boolean };
        if (p.from === userId) setOtherTyping(p.typing);
      })
      .subscribe();
    typingChRef.current = ch;
    return () => { ch.unsubscribe(); typingChRef.current = null; };
  }, [roomId, user, userId, markRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  // Typing broadcast (debounced)
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
    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: user.id, content: text });
    if (error) toast.error(error.message);
  }

  // ESC closes menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const myLastMessageAt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender_id === user?.id) return messages[i].created_at;
    return null;
  }, [messages, user?.id]);

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white">
      {/* Top bar */}
      <header className="h-14 shrink-0 px-3 flex items-center gap-3 bg-black">
        <button onClick={goBack} className="p-2 -ml-2 text-white" aria-label="Back">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        {other && (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <div className="relative">
              {other.avatar_url ? (
                <img src={other.avatar_url} alt="" loading="lazy" width={32} height={32} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-xs">{other.username[0]?.toUpperCase()}</div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-black ${other.is_online ? "bg-[#22C55E]" : "bg-[#555]"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white truncate leading-tight">{other.username}</p>
              <p className="text-[11px] text-[#888] leading-tight">{otherTyping ? <span className="text-[#22C55E]">typing…</span> : other.is_online ? "online" : "offline"}</p>
            </div>
          </div>
        )}
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2 text-white" aria-label="More">
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin" style={{ paddingBottom: 16 }}>
        {messages.length === 0 && (
          <div className="text-center text-[12px] text-[#666] py-8">Say hi 👋</div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.sender_id === user!.id} myLastAt={myLastMessageAt} otherLastRead={otherLastRead} />
        ))}
        {otherTyping && (
          <div className="flex justify-start mb-1">
            <div className="bg-[#1C1C1E] rounded-[18px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#888] dot-bounce-1" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#888] dot-bounce-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#888] dot-bounce-3" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="shrink-0 bg-black px-3 py-2"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)`, transform: inset ? `translateY(-${inset}px)` : undefined, transition: "transform 200ms ease" }}
      >
        <div className="flex items-end gap-2 bg-[#1C1C1E] rounded-[20px] pl-4 pr-1.5 py-1.5 min-h-[44px]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[15px] resize-none py-2 leading-5 placeholder:text-[#666] max-h-[88px]"
            style={{ height: Math.min(88, Math.max(20, input.split("\n").length * 20)) }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className={`h-9 w-9 rounded-full bg-[#7C3AED] flex items-center justify-center transition-opacity duration-200 ${input.trim() ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <ArrowUp className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Bottom sheet menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full bg-[#1C1C1E] rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-10 rounded-full bg-[#333] mx-auto mb-4" />
            <button onClick={() => { setMenuOpen(false); toast.success("Report received. Our team will review within 24h."); }} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm">Report</button>
            <button onClick={() => { setMenuOpen(false); toast.success("Blocked"); goBack(); }} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm text-red-400">Block</button>
            <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-2 rounded-full bg-black text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const Bubble = memo(function Bubble({ m, mine, myLastAt, otherLastRead }: { m: Msg; mine: boolean; myLastAt: string | null; otherLastRead: string | null }) {
  const isMyLast = mine && myLastAt === m.created_at;
  const seen = isMyLast && otherLastRead && otherLastRead >= m.created_at;
  const delivered = isMyLast && !seen;
  return (
    <div className={`flex mb-1.5 ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        <div className={`px-3.5 py-2.5 text-[15px] break-words ${mine ? "bg-[#7C3AED] text-white rounded-[18px] rounded-br-[4px]" : "bg-[#1C1C1E] text-white rounded-[18px] rounded-bl-[4px]"}`}>
          {m.content}
        </div>
        <div className={`mt-0.5 flex items-center gap-1 text-[11px] text-[#666] ${mine ? "justify-end" : "justify-start"}`}>
          <span>{fmtTime(m.created_at)}</span>
          {isMyLast && (
            seen ? <CheckCheck className="h-3 w-3 text-[#7C3AED]" strokeWidth={1.5} />
            : delivered ? <CheckCheck className="h-3 w-3 text-[#666]" strokeWidth={1.5} />
            : <Check className="h-3 w-3 text-[#666]" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </div>
  );
});
