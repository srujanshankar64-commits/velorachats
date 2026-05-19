import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Smile, Phone, MoreVertical, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmbientBackground } from "@/components/ambient-background";
import { FEED_USERS, RECENT_CHATS } from "@/lib/mock-data";

export const Route = createFileRoute("/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — Velora" }] }),
  component: ChatPage,
});

type Msg = { id: string; from: "me" | "them"; text: string };

function ChatPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const user = useMemo(
    () => [...FEED_USERS, ...RECENT_CHATS.map((r) => r.user)].find((u) => u.id === userId),
    [userId]
  );

  const [messages, setMessages] = useState<Msg[]>(() => [
    { id: "1", from: "them", text: "heyy 👋" },
    { id: "2", from: "them", text: "saw your profile and had to message" },
    { id: "3", from: "me", text: "lol hi, that's sweet" },
  ]);
  const [input, setInput] = useState("");
  const [theyTyping, setTheyTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, theyTyping]);

  if (!user) {
    return (
      <AppShell>
        <div className="p-10 text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Link to="/messages" className="text-primary underline">Back to messages</Link>
        </div>
      </AppShell>
    );
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "me", text }]);
    setInput("");
    setTimeout(() => setTheyTyping(true), 600);
    setTimeout(() => {
      setTheyTyping(false);
      const replies = ["haha really?", "okay that's interesting", "tell me more 👀", "lol same", "you're funny", "omg 😂"];
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "them", text: replies[Math.floor(Math.random() * replies.length)] }]);
    }, 1800);
  }

  return (
    <AppShell>
      <AmbientBackground />
      <div className="px-3 md:px-8 py-4 md:py-8 max-w-3xl mx-auto">
        <div className="glass-strong rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate({ to: "/messages" })} className="p-2 rounded-xl hover:bg-white/10 transition md:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <img src={user.avatar} alt="" className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-neon-pink p-0.5" />
                {user.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm">{user.username}</p>
                  {user.verified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
                  <span className="ml-1">{user.flag}</span>
                </div>
                <p className="text-xs text-green-400">{user.online ? "online" : "last seen recently"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-xl hover:bg-white/10 transition"><Phone className="h-4 w-4" /></button>
              <button className="p-2 rounded-xl hover:bg-white/10 transition"><MoreVertical className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    m.from === "me"
                      ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                      : "glass rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
            {theyTyping && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-border/40">
            <div className="flex items-center gap-2 glass rounded-2xl p-2">
              <button className="p-2 rounded-xl hover:bg-white/10 transition">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Message ${user.username}…`}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center disabled:opacity-40 hover:scale-105 transition glow-primary"
              >
                <Send className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
