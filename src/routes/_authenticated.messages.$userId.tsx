import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, UserPlus, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — Velora" }] }),
  component: DMChat,
});

type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Other = { id: string; username: string; avatar_url: string | null; is_online: boolean };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string; is_temporary: boolean; expires_at: string | null };

function DMChat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const { markRead } = useUnread();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [friend, setFriend] = useState<Friendship | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prof }, { data: rid, error }, { data: fs }] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url,is_online").eq("id", userId).single(),
        supabase.rpc("get_or_create_dm", { target: userId }),
        supabase.from("friendships").select("*").or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`).maybeSingle(),
      ]);
      if (!active) return;
      if (prof) setOther(prof as Other);
      if (error) return toast.error(error.message);
      setRoomId(rid as string);
      setFriend(fs as Friendship | null);
      const { data: msgs } = await supabase.from("messages").select("*").eq("room_id", rid as string).order("created_at");
      if (active && msgs) setMessages(msgs as Msg[]);
      // Mark as read on entry
      markRead(userId);
    })();
    return () => { active = false; };
  }, [userId, user, markRead]);

  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase.channel(`dm:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id !== user.id) markRead(userId);
        })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [roomId, user, userId, markRead]);

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

  async function addFriend(temporary: boolean) {
    if (!user) return;
    if (friend?.status === "accepted") return toast("Already friends");
    const expires_at = temporary ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const { data, error } = await supabase.from("friendships").insert({
      requester_id: user.id, addressee_id: userId, is_temporary: temporary, expires_at, status: "accepted",
    }).select().single();
    if (error) return toast.error(error.message);
    setFriend(data as Friendship);
    toast.success(temporary ? "Timepass friend for 24h ⏳" : "Friend added ✨");
  }

  const isFriend = friend?.status === "accepted";

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 bg-background">
        <Link to="/messages" className="p-1.5 rounded-lg hover:bg-white/5"><ArrowLeft className="h-5 w-5" /></Link>
        {other && (
          <>
            <div className="relative shrink-0">
              {other.avatar_url ? <img src={other.avatar_url} alt="" loading="lazy" className="h-9 w-9 rounded-full" /> :
                <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-sm">{other.username[0]?.toUpperCase()}</div>}
              {other.is_online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{other.username}</p>
              <p className="text-[10px] text-muted-foreground">{other.is_online ? "online" : "offline"}{friend?.is_temporary ? " · timepass" : ""}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isFriend ? (
                <span className="h-8 px-2.5 rounded-full glass flex items-center gap-1 text-[11px] text-green-400"><Check className="h-3 w-3" /> Friend</span>
              ) : (
                <>
                  <button onClick={() => addFriend(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center" title="Add friend"><UserPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => addFriend(true)} className="h-8 w-8 rounded-full glass flex items-center justify-center" title="Timepass (24h)"><Clock className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-muted-foreground py-6">
            <span className="px-3 py-1 glass rounded-full">Say hi 👋</span>
          </div>
        )}
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

      <div className="p-2.5 border-t border-border/60 bg-background pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
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
