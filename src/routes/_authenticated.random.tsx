import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shuffle, SkipForward, Send, X, Sparkles, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { startPresence } from "@/lib/presence";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/random")({
  head: () => ({ meta: [{ title: "Random Chat — Velora" }] }),
  component: RandomPage,
});

type Phase = "setup" | "searching" | "chatting";
type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Partner = { id: string; username: string; avatar_url: string | null; gender: string; country: string | null; age: number | null };

function RandomPage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [myGender, setMyGender] = useState<"male" | "female" | "other">("male");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("female");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queueChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load profile defaults + presence
  useEffect(() => {
    if (!user) return;
    const stop = startPresence(user.id);
    supabase.from("profiles").select("gender,prefer_gender").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setMyGender(data.gender as typeof myGender);
        setPrefer(data.prefer_gender as typeof prefer);
      }
    });
    return stop;
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const cleanupQueue = () => {
    queueChannelRef.current?.unsubscribe();
    queueChannelRef.current = null;
  };
  const cleanupMessages = () => {
    msgChannelRef.current?.unsubscribe();
    msgChannelRef.current = null;
  };

  useEffect(() => () => { cleanupQueue(); cleanupMessages(); }, []);

  async function loadPartnerForRoom(rid: string) {
    const { data: room } = await supabase.from("chat_rooms").select("user_a,user_b").eq("id", rid).single();
    if (!room || !user) return;
    const otherId = room.user_a === user.id ? room.user_b : room.user_a;
    const { data: prof } = await supabase.from("profiles").select("id,username,avatar_url,gender,country,age").eq("id", otherId).single();
    if (prof) setPartner(prof as Partner);
  }

  async function enterRoom(rid: string) {
    cleanupQueue();
    setRoomId(rid);
    setMessages([]);
    setPhase("chatting");
    await loadPartnerForRoom(rid);
    // Load existing messages
    const { data: msgs } = await supabase.from("messages").select("*").eq("room_id", rid).order("created_at");
    if (msgs) setMessages(msgs as Msg[]);
    // Subscribe to new messages
    const ch = supabase.channel(`room:${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${rid}` }, (payload) => {
        setMessages((m) => m.some((x) => x.id === (payload.new as Msg).id) ? m : [...m, payload.new as Msg]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${rid}` }, (payload) => {
        if ((payload.new as { ended_at: string | null }).ended_at) {
          toast("Stranger left the chat");
        }
      })
      .subscribe();
    msgChannelRef.current = ch;
  }

  async function startSearch() {
    if (!user) return;
    cleanupMessages();
    setPhase("searching");
    setMessages([]);
    setPartner(null);
    setRoomId(null);

    // Save preferences
    await supabase.from("profiles").update({ gender: myGender, prefer_gender: prefer }).eq("id", user.id);

    const { data, error } = await supabase.rpc("find_or_enqueue_match", { p_gender: myGender, p_prefer: prefer });
    if (error) { toast.error(error.message); setPhase("setup"); return; }

    if (data) {
      await enterRoom(data as string);
      return;
    }

    // Wait via realtime for matched_room_id update
    const ch = supabase.channel(`queue:${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_queue", filter: `user_id=eq.${user.id}` }, (payload) => {
        const rid = (payload.new as { matched_room_id: string | null }).matched_room_id;
        if (rid) enterRoom(rid);
      })
      .subscribe();
    queueChannelRef.current = ch;
  }

  async function cancelSearch() {
    if (!user) return;
    cleanupQueue();
    await supabase.from("match_queue").delete().eq("user_id", user.id);
    setPhase("setup");
  }

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: user.id, content: text });
    if (error) toast.error(error.message);
  }

  async function endChat() {
    cleanupMessages();
    if (roomId) {
      await supabase.from("chat_rooms").update({ ended_at: new Date().toISOString() }).eq("id", roomId);
    }
    setRoomId(null);
    setPartner(null);
    setMessages([]);
    setPhase("setup");
  }

  async function skip() {
    await endChat();
    await startSearch();
  }

  if (phase === "chatting" && partner) {
    return (
      <div className="flex flex-col h-[100dvh] md:h-screen">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 glass-strong">
          <div className="flex items-center gap-3">
            <div className="relative">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt="" loading="lazy" className="h-10 w-10 rounded-full" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center font-bold">{partner.username[0]?.toUpperCase()}</div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />
            </div>
            <div>
              <p className="font-semibold text-sm">{partner.username}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{partner.gender}{partner.age ? ` · ${partner.age}` : ""}{partner.country ? ` · ${partner.country}` : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => nav({ to: "/messages/$userId", params: { userId: partner.id } })} className="px-3 py-1.5 rounded-lg glass text-xs">Add</button>
            <button onClick={skip} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs"><SkipForward className="h-3.5 w-3.5" />Skip</button>
            <button onClick={endChat} className="p-2 rounded-lg glass"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
          <div className="text-center text-[11px] text-muted-foreground py-2">
            <span className="px-3 py-1 glass rounded-full">Connected · say hi 👋</span>
          </div>
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
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              maxLength={2000}
              className="flex-1 bg-transparent outline-none text-sm px-3"
            />
            <button onClick={send} disabled={!input.trim()} className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center disabled:opacity-40">
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="relative w-28 h-28 mb-7">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" style={{ animationDelay: "0.7s" }} />
          <div className="relative h-28 w-28 rounded-full bg-gradient-primary flex items-center justify-center glow-neon">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Finding someone…</h2>
        <p className="text-muted-foreground text-sm mb-6">Connecting you with a real stranger</p>
        <button onClick={cancelSearch} className="text-sm text-muted-foreground underline">Cancel</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:py-10 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Random <span className="neon-text">chat</span></h1>
          <p className="text-sm text-muted-foreground">Meet a real person right now</p>
        </div>
        <button onClick={() => signOut()} className="p-2 rounded-lg glass"><LogOut className="h-4 w-4" /></button>
      </div>
      <div className="glass-strong rounded-3xl p-5 space-y-5">
        <div>
          <p className="text-xs font-medium mb-2 text-muted-foreground">I am</p>
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button key={g} onClick={() => setMyGender(g)} className={`py-2.5 rounded-xl text-sm font-medium capitalize ${myGender === g ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{g}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-2 text-muted-foreground">Match me with</p>
          <div className="grid grid-cols-3 gap-2">
            {([{ v: "female", l: "Females" }, { v: "male", l: "Males" }, { v: "any", l: "Anyone" }] as const).map((p) => (
              <button key={p.v} onClick={() => setPrefer(p.v)} className={`py-2.5 rounded-xl text-sm font-medium ${prefer === p.v ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{p.l}</button>
            ))}
          </div>
        </div>
        <button onClick={startSearch} className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold glow-primary flex items-center justify-center gap-2">
          <Shuffle className="h-5 w-5" /> Find someone now
        </button>
        <p className="text-[11px] text-center text-muted-foreground">Be kind. Don't share personal info. ✨</p>
      </div>
    </div>
  );
}
