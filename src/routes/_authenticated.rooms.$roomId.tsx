import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({ meta: [{ title: "Room — Velora" }] }),
  component: Room,
});

type Msg = { id: string; user_id: string; content: string; created_at: string; username?: string };
const TITLES: Record<string, string> = { dating: "Dating Room", friendship: "Friendship Room", open: "Open Chat" };

function Room() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const lastSentRef = useRef<{ text: string; count: number; at: number }>({ text: "", count: 0, at: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("room_messages")
        .select("id,user_id,content,created_at,profiles:user_id(username)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active || !data) return;
      const ordered = [...data].reverse();
      const cache: Record<string, string> = {};
      const mapped = ordered.map((m: any) => {
        const uname = m.profiles?.username || "unknown";
        cache[m.user_id] = uname;
        return {
          id: m.id,
          user_id: m.user_id,
          content: m.content,
          created_at: m.created_at,
        };
      });
      setProfilesCache((prev) => ({ ...prev, ...cache }));
      setMsgs(mapped as Msg[]);
    })();
    const ch = supabase.channel(`room:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (p) => setMsgs((prev) => [...prev, p.new as Msg]))
      .subscribe();
    return () => { active = false; ch.unsubscribe(); };
  }, [roomId]);

  useEffect(() => {
    const missing = msgs.map((m) => m.user_id).filter((uid) => !profilesCache[uid]);
    if (missing.length > 0) {
      const uniqueMissing = Array.from(new Set(missing));
      supabase
        .from("profiles")
        .select("id,username")
        .in("id", uniqueMissing)
        .then(({ data }) => {
          if (data) {
            const updates: Record<string, string> = {};
            data.forEach((p) => {
              updates[p.id] = p.username;
            });
            setProfilesCache((prev) => ({ ...prev, ...updates }));
          }
        });
    }
  }, [msgs, profilesCache]);

  useEffect(() => {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || !user) return;
    const now = Date.now();
    if (now - lastSentRef.current.at < 1000) return;
    if (text === lastSentRef.current.text) {
      const c = lastSentRef.current.count + 1;
      if (c >= 3) { toast.error("Please don't send the same message repeatedly."); return; }
      lastSentRef.current = { text, count: c, at: now };
    } else {
      lastSentRef.current = { text, count: 1, at: now };
    }
    setInput("");
    const { error } = await supabase.from("room_messages").insert({ room_id: roomId, user_id: user.id, content: text });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white">
      <header className="h-14 px-3 flex items-center gap-3 bg-black">
        <button onClick={() => nav({ to: "/rooms" })} className="p-2 -ml-2"><ArrowLeft className="h-6 w-6" strokeWidth={1.5} /></button>
        <p className="text-sm">{TITLES[roomId] ?? "Room"}</p>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {msgs.map((m) => {
          const isMine = m.user_id === user?.id;
          const uname = profilesCache[m.user_id] || "Loading...";
          return (
            <div key={m.id} className={`flex flex-col mb-1.5 ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && (
                <span className="text-[11px] text-[#888] ml-2 mb-0.5">@{uname}</span>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 text-[15px] rounded-[18px] ${isMine ? "bg-[#7C3AED] rounded-br-[4px]" : "bg-[#1C1C1E] rounded-bl-[4px]"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center py-1">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#444] hover:text-[#666] transition-colors"
          >
            sponsored
          </a>
        </div>
      <div className="shrink-0 bg-black px-3 py-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex items-end gap-2 bg-[#1C1C1E] rounded-[20px] pl-4 pr-1.5 py-1.5 min-h-[44px]">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} placeholder="Message…" maxLength={1000} className="flex-1 bg-transparent outline-none text-[15px] py-2 placeholder:text-[#666]" />
          <button onClick={send} disabled={!input.trim()} className={`h-9 w-9 rounded-full bg-[#7C3AED] flex items-center justify-center ${input.trim() ? "opacity-100" : "opacity-0 pointer-events-none"}`}><ArrowUp className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
      </div>
    </div>
  );
}
