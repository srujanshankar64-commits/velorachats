import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, MoreHorizontal, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { startPresence } from "@/lib/presence";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/random")({
  head: () => ({ meta: [{ title: "Random — Velora" }] }),
  component: RandomPage,
});

type Phase = "searching" | "chatting";
type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Partner = { id: string; username: string; avatar_url: string | null; is_online: boolean };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function RandomPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("searching");
  const [waiters, setWaiters] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queueChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inset = useKeyboardInset();
  const searchStartRef = useRef<number>(Date.now());

  const phaseRef = useRef(phase);
  const userRef = useRef(user);

  useEffect(() => {
    phaseRef.current = phase;
    userRef.current = user;
  }, [phase, user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const u = userRef.current;
      const p = phaseRef.current;
      if (u && p === "searching") {
        const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID || "uavwrahakmzmfdwqwnek";
        const dataStr = localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed?.currentSession?.access_token;
            if (token) {
              fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/match_queue?user_id=eq.${u.id}`,
                {
                  method: "DELETE",
                  headers: {
                    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  keepalive: true
                }
              );
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const cleanupQueue = useCallback(() => { queueChRef.current?.unsubscribe(); queueChRef.current = null; }, []);
  const cleanupMsgs = useCallback(() => { msgChRef.current?.unsubscribe(); msgChRef.current = null; }, []);

  useEffect(() => {
    return () => {
      cleanupQueue();
      cleanupMsgs();
      const u = userRef.current;
      const p = phaseRef.current;
      if (u && p === "searching") {
        supabase.from("match_queue").delete().eq("user_id", u.id).then(() => {});
      }
    };
  }, [cleanupQueue, cleanupMsgs]);

  const enterRoom = useCallback(async (rid: string) => {
    if (!user) return;
    cleanupQueue();
    setRoomId(rid);
    setMessages([]);
    setPhase("chatting");
    const { data: room } = await supabase.from("chat_rooms").select("user_a,user_b").eq("id", rid).single();
    if (room) {
      const otherId = room.user_a === user.id ? room.user_b : room.user_a;
      const { data: prof } = await supabase.from("profiles").select("id,username,avatar_url,is_online").eq("id", otherId).single();
      if (prof) setPartner(prof as Partner);
    }
    const { data: msgs } = await supabase.from("messages").select("*").eq("room_id", rid).order("created_at");
    if (msgs) setMessages(msgs as Msg[]);
    const ch = supabase.channel(`room:${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${rid}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${rid}` },
        (payload) => { if ((payload.new as { ended_at: string | null }).ended_at) toast("Stranger left"); })
      .subscribe();
    msgChRef.current = ch;
  }, [user, cleanupQueue]);

  const startSearch = useCallback(async () => {
    if (!user) return;
    cleanupMsgs();
    setPhase("searching");
    setMessages([]); setPartner(null); setRoomId(null);
    searchStartRef.current = Date.now();
    setElapsed(0);

    const { data: prof } = await supabase.from("profiles").select("gender,prefer_gender").eq("id", user.id).single();
    const myGender = (prof?.gender ?? "other") as "male" | "female" | "other";
    const prefer = (prof?.prefer_gender ?? "any") as "male" | "female" | "any";

    const { data, error } = await supabase.rpc("find_or_enqueue_match", { p_gender: myGender, p_prefer: prefer });
    if (error) { toast.error(error.message); return; }
    if (data) { enterRoom(data as string); return; }

    const ch = supabase.channel(`queue:${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_queue", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const rid = (payload.new as { matched_room_id: string | null }).matched_room_id;
          if (rid) enterRoom(rid);
        })
      .subscribe();
    queueChRef.current = ch;
  }, [user, enterRoom, cleanupMsgs]);

  // Kick off first search on mount
  useEffect(() => { if (user && phase === "searching" && !roomId) startSearch(); /* eslint-disable-next-line */ }, [user]);

  // Waiters count + elapsed during search
  useEffect(() => {
    if (phase !== "searching") return;
    let alive = true;
    const refresh = async () => {
      const { count } = await supabase.from("match_queue").select("user_id", { count: "exact", head: true }).is("matched_room_id", null);
      if (alive && typeof count === "number") setWaiters(count);
      if (alive) setElapsed(Math.floor((Date.now() - searchStartRef.current) / 1000));
    };
    refresh();
    const id = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [phase]);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function cancel() {
    if (!user) return;
    cleanupQueue();
    await supabase.from("match_queue").delete().eq("user_id", user.id);
    nav({ to: "/" });
  }

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: user.id, content: text });
    if (error) toast.error(error.message);
  }

  async function endChat() {
    cleanupMsgs();
    if (roomId) await supabase.from("chat_rooms").update({ ended_at: new Date().toISOString() }).eq("id", roomId);
    setRoomId(null); setPartner(null); setMessages([]);
  }
  async function next() { await endChat(); await startSearch(); }

  // ===== SEARCHING UI =====
  if (phase === "searching") {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative h-12 w-12 mb-6">
            <span className="block h-12 w-12 rounded-full border-2 border-[#1C1C1E] border-t-[#7C3AED] spin-slow" />
          </div>
          <p className="text-lg text-white">Finding your match…</p>
          <p className="mt-3 text-sm text-[#888] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            {waiters} {waiters === 1 ? "person" : "people"} waiting right now
          </p>
          <p className="mt-1.5 text-[13px] text-[#666]">
            {elapsed > 30 ? "Taking a little longer… hang tight 🙏" : "Usually connects in under 10 seconds"}
          </p>
          {elapsed >= 5 && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 px-5 py-2.5 rounded-full border border-[#333] text-[13px] text-[#888] hover:text-[#fff] hover:border-[#555] transition-colors"
            >
              While you wait — check this out ✨
            </a>
          )}
        </div>
        <div className="pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
          <button onClick={cancel} className="text-sm text-[#888]">Cancel</button>
        </div>
      </div>
    );
  }

  // ===== CHATTING UI =====
  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white">
      <header className="h-14 shrink-0 px-3 flex items-center gap-3 bg-black">
        <button onClick={endChat} className="p-2 -ml-2 text-white" aria-label="Back">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        {partner && (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <div className="relative">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt="" loading="lazy" width={32} height={32} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-xs">{partner.username[0]?.toUpperCase()}</div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-black ${partner.is_online ? "bg-[#22C55E]" : "bg-[#555]"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate leading-tight">{partner.username}</p>
              <p className="text-[11px] text-[#888] leading-tight">stranger</p>
            </div>
          </div>
        )}
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2" aria-label="More"><MoreHorizontal className="h-5 w-5" strokeWidth={1.5} /></button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <div className="text-center text-[12px] text-[#666] py-4">Connected · say hi 👋</div>
        {messages.map((m) => (
          <RBubble key={m.id} m={m} mine={m.sender_id === user!.id} />
        ))}
      </div>

      <div className="relative shrink-0 bg-black px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]" style={{ transform: inset ? `translateY(-${inset}px)` : undefined, transition: "transform 200ms ease" }}>
        <button onClick={next} className="absolute left-1/2 -translate-x-1/2 -top-3 px-4 h-10 rounded-full border border-white/30 text-[13px] bg-black">Next person →</button>
        <div className="flex items-end gap-2 bg-[#1C1C1E] rounded-[20px] pl-4 pr-1.5 py-1.5 min-h-[44px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…"
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[15px] py-2 placeholder:text-[#666]"
          />
          <button onClick={send} disabled={!input.trim()} aria-label="Send" className={`h-9 w-9 rounded-full bg-[#7C3AED] flex items-center justify-center transition-opacity duration-200 ${input.trim() ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <ArrowUp className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full bg-[#1C1C1E] rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-10 rounded-full bg-[#333] mx-auto mb-4" />
            <button onClick={() => { setMenuOpen(false); toast.success("Report received."); }} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm">Report</button>
            <button onClick={() => { setMenuOpen(false); next(); }} className="w-full h-12 text-left px-3 rounded-xl hover:bg-white/5 text-sm text-red-400">Block & next</button>
            <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-2 rounded-full bg-black text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const RBubble = memo(function RBubble({ m, mine }: { m: Msg; mine: boolean }) {
  return (
    <div className={`flex mb-1.5 ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        <div className={`px-3.5 py-2.5 text-[15px] break-words ${mine ? "bg-[#7C3AED] text-white rounded-[18px] rounded-br-[4px]" : "bg-[#1C1C1E] text-white rounded-[18px] rounded-bl-[4px]"}`}>
          {m.content}
        </div>
        <div className={`mt-0.5 flex items-center gap-1 text-[11px] text-[#666] ${mine ? "justify-end" : "justify-start"}`}>
          <span>{fmtTime(m.created_at)}</span>
          {mine && <Check className="h-3 w-3 text-[#666]" strokeWidth={1.5} />}
        </div>
      </div>
    </div>
  );
});
