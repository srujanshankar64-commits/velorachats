import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, MoreHorizontal, Check, CheckCheck, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { toast } from "sonner";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({
    meta: [
      { title: "Chat — Velora" },
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
  _deleting?: boolean;
};
type Other = { id: string; username: string; avatar_url: string | null; is_online: boolean; last_seen_at?: string | null };

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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  // Separate refs: one for the typing broadcast channel, one for the msgs channel
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgsChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track last polled timestamp for fallback polling
  const lastPollTsRef = useRef<string>(new Date(0).toISOString());
  
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const receiverTypingTimeoutRef = useRef<number | null>(null);
  
  const inset = useKeyboardInset();
  useSwipeBack(goBack);

  // Tab title badge
  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) Velora` : "Velora";
    return () => { document.title = "ShhChats"; };
  }, [unreadTotal]);

  // Load room + profile + history
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prof }, { data: rid, error }] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url,is_online,last_seen_at").eq("id", userId).single(),
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
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (msgs) {
        const sorted = [...msgs].reverse() as Msg[];
        setMessages(sorted);
        // Seed the poll cursor so we only fetch messages newer than what we already have
        if (sorted.length > 0) {
          lastPollTsRef.current = sorted[sorted.length - 1].created_at;
        }
      }
      markRead(userId);

      // Mark their messages as read now
      await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("room_id", rid as string)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    })();
    return () => { active = false; };
  }, [userId, user, markRead]);

  // Real-time presence status listener for the partner (heartbeat threshold)
  useEffect(() => {
    if (!other) return;
    const checkOnline = () => {
      const isOnline = other.is_online && other.last_seen_at && (Date.now() - new Date(other.last_seen_at).getTime() < 60000);
      setIsPartnerOnline(!!isOnline);
    };
    checkOnline();
    const timer = setInterval(checkOnline, 10000);
    return () => clearInterval(timer);
  }, [other]);

  // Real-time listener for database updates on this specific partner's profile
  useEffect(() => {
    const ch = supabase.channel(`profile-partner:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as Other & { last_seen_at?: string };
          setOther((prev) => prev ? { ...prev, ...updated } : null);
        })
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [userId]);

  const handleDeleteMessage = useCallback((deletedId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === deletedId ? { ...m, _deleting: true } : m))
    );
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
    }, 400);
  }, []);

  // Channel 1: postgres_changes for messages (INSERT / UPDATE / DELETE)
  // Kept separate from broadcast so both can work independently
  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase
      .channel(`msgs:${roomId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as Msg;
          // Update lastPollTs so polling doesn't duplicate
          if (m.created_at > lastPollTsRef.current) lastPollTsRef.current = m.created_at;
          setMessages((prev) => {
            const idx = prev.findIndex((x) => x._local && x.sender_id === m.sender_id && x.content === m.content);
            if (idx >= 0) {
              const copy = prev.slice();
              copy[idx] = m;
              return copy;
            }
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id !== user.id) {
            markRead(userId);
            supabase.from("messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const oldId = (payload.old as { id: string }).id;
          handleDeleteMessage(oldId);
        })
      .subscribe();
    msgsChRef.current = ch;
    return () => { ch.unsubscribe(); msgsChRef.current = null; };
  }, [roomId, user, userId, markRead, handleDeleteMessage]);

  // Channel 2: broadcast-only channel for typing indicator
  // Set ref BEFORE subscribe to avoid race condition where user types before subscription completes
  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase
      .channel(`tc${roomId}`, { config: { broadcast: { self: false, ack: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { from: string; typing: boolean };
        if (p.from === userId) {
          setOtherTyping(p.typing);
          if (receiverTypingTimeoutRef.current) {
            window.clearTimeout(receiverTypingTimeoutRef.current);
            receiverTypingTimeoutRef.current = null;
          }
          if (p.typing) {
            receiverTypingTimeoutRef.current = window.setTimeout(() => {
              setOtherTyping(false);
              receiverTypingTimeoutRef.current = null;
            }, 4000);
          }
        }
      });
    // Set ref BEFORE subscribe so broadcastTyping works immediately
    typingChRef.current = ch;
    ch.subscribe();
    return () => { ch.unsubscribe(); typingChRef.current = null; };
  }, [roomId, user, userId]);

  // Polling fallback: fetch new messages every 3s in case WebSocket drops
  useEffect(() => {
    if (!roomId || !user) return;
    const poll = async () => {
      const since = lastPollTsRef.current;
      const { data } = await supabase
        .from("messages")
        .select("id,sender_id,content,created_at,read_at,delivered_at,status")
        .eq("room_id", roomId)
        .gt("created_at", since)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return;
      // Update lastPollTs to the newest message
      lastPollTsRef.current = data[data.length - 1].created_at;
      setMessages((prev) => {
        let next = [...prev];
        for (const m of data as Msg[]) {
          // Replace optimistic local message if exists
          const idx = next.findIndex((x) => x._local && x.sender_id === m.sender_id && x.content === m.content);
          if (idx >= 0) { next[idx] = m; continue; }
          // Skip if already in list
          if (next.some((x) => x.id === m.id)) continue;
          next = [...next, m];
          // Auto-mark incoming messages as read
          if (m.sender_id !== user.id) {
            supabase.from("messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
          }
        }
        return next;
      });
    };
    const interval = window.setInterval(poll, 1000);
    return () => window.clearInterval(interval);
  }, [roomId, user]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    if (emojiPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  const broadcastTyping = useCallback((typing: boolean) => {
    const ch = typingChRef.current;
    if (!ch || !user) return;
    ch.send({ type: "broadcast", event: "typing", payload: { from: user.id, typing } });
  }, [user]);

  const onInputChange = useCallback((v: string) => {
    setInput(v);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTyping(true);
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      broadcastTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [broadcastTyping]);

  const handleSelectEmoji = (emoji: any) => {
    setInput((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      broadcastTyping(false);
    }

    if (CRISIS_RE.test(text)) setCrisis(true);

    // Optimistic
    const tempId = "local-" + Date.now();
    const optimistic: Msg = {
      id: tempId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      status: "sending",
      _local: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: user.id, content: text });
    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      toast.error("Couldn't send");
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

  const myLastMessageAt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender_id === user?.id) return messages[i].created_at;
    return null;
  }, [messages, user?.id]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0D0D0F] text-[#E8EAED]">
      {/* Top bar */}
      <header className="h-[60px] shrink-0 px-3 flex items-center gap-3 bg-[#1A1A1F] border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={goBack} className="p-2 -ml-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        {other && (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <div className="relative">
              {other.avatar_url ? (
                <img src={other.avatar_url} alt="" loading="lazy" width={36} height={36} className="h-9 w-9 rounded-full" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#8AB4F8] text-[#0D0D0F] flex items-center justify-center text-sm font-semibold">{other.username[0]?.toUpperCase()}</div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#1A1A1F] ${isPartnerOnline ? "bg-[#4ADE80]" : "bg-[#5F6368]"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#E8EAED] truncate leading-tight">{other.username}</p>
              <p className="text-[11px] text-[#9AA0A6] leading-tight">
                {otherTyping ? <span className="text-[#4ADE80]">typing…</span> : isPartnerOnline ? "online" : "offline"}
              </p>
            </div>
          </div>
        )}
        <button disabled className="p-2 text-[#5F6368]" aria-label="Voice (coming soon)" title="Coming soon"><Phone className="h-5 w-5" strokeWidth={1.5} /></button>
        <button disabled className="p-2 text-[#5F6368]" aria-label="Video (coming soon)" title="Coming soon"><Video className="h-5 w-5" strokeWidth={1.5} /></button>
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2" aria-label="More">
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin chat-scroll" style={{ paddingBottom: 16 }}>
        <div className="text-center my-3">
          <span className="inline-block px-3 py-1 italic rounded-full bg-[#1A1A1F] text-[#9AA0A6] border-soft">
            You're both up late. Say hello 🌙
          </span>
        </div>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.sender_id === user!.id} myLastAt={myLastMessageAt} />
        ))}
        {crisis && (
          <div className="text-center my-3">
            <span className="inline-block px-3 py-1.5 text-[11px] rounded-full bg-accent-soft text-[#8AB4F8] border border-[rgba(138,180,248,0.20)]">
              💙 iCall: 9152987821 · Vandrevala: 1860-2662-345
            </span>
          </div>
        )}
        {otherTyping && (
          <div className="flex justify-start mb-1">
            <div className="bg-[#222228] rounded-[18px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9AA0A6] dot-bounce-1" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9AA0A6] dot-bounce-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9AA0A6] dot-bounce-3" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="shrink-0 bg-[#0D0D0F] px-3 py-2 border-t border-[rgba(255,255,255,0.06)]"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)`, transform: inset ? `translateY(-${inset}px)` : undefined, transition: "transform 200ms ease" }}
      >
        <div className="relative flex items-end gap-2 bg-[#2A2A32] rounded-[22px] pl-4 pr-1.5 py-1.5 min-h-[44px] border-soft">
          {emojiPickerOpen && (
            <div ref={pickerRef} className="absolute bottom-14 right-0 z-50">
              <Picker
                data={data}
                onEmojiSelect={handleSelectEmoji}
                theme="dark"
                set="native"
              />
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[16px] resize-none py-2 leading-5 placeholder:text-[#5F6368] max-h-[120px]"
          />
          <button
            type="button"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            className="h-10 w-10 flex items-center justify-center text-[#9AA0A6] hover:text-white"
            aria-label="Choose emoji"
          >
            😊
          </button>
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-opacity duration-200 ${input.trim() ? "bg-[#8AB4F8] opacity-100" : "bg-[#222228] opacity-100"}`}
          >
            <ArrowUp className={`h-5 w-5 ${input.trim() ? "text-[#0D0D0F]" : "text-[#5F6368]"}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom sheet menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full bg-[#1A1A1F] rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] fade-up border-t border-[rgba(255,255,255,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-10 rounded-full bg-[#5F6368] mx-auto mb-4" />
            <button onClick={() => reportUser("Spam")} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm">Report spam</button>
            <button onClick={() => reportUser("Harassment")} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm">Report harassment</button>
            <button onClick={() => reportUser("Inappropriate")} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm">Report inappropriate</button>
            <button onClick={blockUser} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm text-[#F87171]">Block this person</button>
            <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-2 rounded-full bg-[#0D0D0F] text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const Bubble = memo(function Bubble({ m, mine, myLastAt }: { m: Msg; mine: boolean; myLastAt: string | null }) {
  const isMyLast = mine && myLastAt === m.created_at;
  const failed = m.status === "failed";
  const sending = m._local && m.status === "sending";
  const seen = !!m.read_at;
  const delivered = !!m.delivered_at;
  return (
    <div className={`flex mb-1.5 ${mine ? "justify-end" : "justify-start"} transition-all duration-400 ease-in-out ${m._deleting ? "opacity-0 scale-95 max-h-0 mb-0 overflow-hidden" : ""}`}>
      <div className="max-w-[80%]">
        <div className={`px-3.5 py-2.5 text-[15px] break-words ${mine
            ? "bg-[#8AB4F8] text-[#0D0D0F] rounded-[18px] rounded-br-[4px]"
            : "bg-[#222228] text-[#E8EAED] rounded-[18px] rounded-bl-[4px]"}`}>
          {m.content}
        </div>
        <div className={`mt-0.5 flex items-center gap-1 text-[11px] text-[#5F6368] ${mine ? "justify-end" : "justify-start"}`}>
          <span>{fmtTime(m.created_at)}</span>
          {mine && (
            failed ? <span className="text-[#F87171]">failed</span>
            : sending ? <span className="text-[#5F6368]">…</span>
            : isMyLast && seen ? <CheckCheck className="h-3 w-3 text-[#8AB4F8]" strokeWidth={2} />
            : isMyLast && delivered ? <CheckCheck className="h-3 w-3 text-[#5F6368]" strokeWidth={2} />
            : isMyLast ? <Check className="h-3 w-3 text-[#5F6368]" strokeWidth={2} /> : null
          )}
        </div>
      </div>
    </div>
  );
});
