import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — Velora" }] }),
  component: DMChat,
});

type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Other = { id: string; username: string; avatar_url: string | null; is_online: boolean };

function DMChat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("id,username,avatar_url,is_online").eq("id", userId).single();
      if (!active) return;
      if (prof) setOther(prof as Other);
      const { data: rid, error } = await supabase.rpc("get_or_create_dm", { target: userId });
      if (error) return toast.error(error.message);
      if (!active) return;
      setRoomId(rid as string);
      const { data: msgs } = await supabase.from("messages").select("*").eq("room_id", rid as string).order("created_at");
      if (active && msgs) setMessages(msgs as Msg[]);
    })();
    return () => { active = false; };
  }, [userId, user]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`dm:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => setMessages((m) => m.some((x) => x.id === (payload.new as Msg).id) ? m : [...m, payload.new as Msg]))
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: user.id, content: text });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 glass-strong">
        <Link to="/messages" className="md:hidden p-1.5 rounded-lg glass"><ArrowLeft className="h-4 w-4" /></Link>
        {other && (
          <>
            <div className="relative">
              {other.avatar_url ? <img src={other.avatar_url} alt="" loading="lazy" className="h-10 w-10 rounded-full" /> :
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center font-bold">{other.username[0]?.toUpperCase()}</div>}
              {other.is_online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{other.username}</p>
              <p className="text-[11px] text-muted-foreground">{other.is_online ? "Online" : "Offline"}</p>
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
        {messages.map((m) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm break-words ${mine ? "bg-gradient-primary text-primary-foreground rounded-br-md" : "glass rounded-bl-md"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2 glass rounded-2xl p-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…" maxLength={2000} className="flex-1 bg-transparent outline-none text-sm px-3" />
          <button onClick={send} disabled={!input.trim()} className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center disabled:opacity-40">
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
