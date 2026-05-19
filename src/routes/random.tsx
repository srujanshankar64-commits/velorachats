import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Shuffle, SkipForward, Send, Smile, X, Sparkles, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmbientBackground } from "@/components/ambient-background";
import { generateUsers, STRANGER_LINES, type Gender, type User } from "@/lib/mock-data";

export const Route = createFileRoute("/random")({
  head: () => ({
    meta: [
      { title: "Random Chat — Velora" },
      { name: "description", content: "Get matched with a random stranger in under a second. Text chat, skip anytime." },
    ],
  }),
  component: RandomChatPage,
});

type Msg = { id: string; from: "me" | "them"; text: string; time: number };
type Phase = "setup" | "searching" | "chatting";

function RandomChatPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [myGender, setMyGender] = useState<Gender>("male");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("female");
  const [partner, setPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [theyTyping, setTheyTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, theyTyping]);

  function startSearch() {
    setPhase("searching");
    setMessages([]);
    clearTimers();
    const delay = 700 + Math.random() * 1500;
    timeouts.current.push(setTimeout(() => {
      const pool = generateUsers(40, Date.now() % 9999);
      const desiredGender: Gender | null = prefer === "any" ? null : prefer;
      const match = pool.find((u) => u.online && (desiredGender ? u.gender === desiredGender : true)) ?? pool[0];
      setPartner(match);
      setPhase("chatting");
      // Stranger opens
      timeouts.current.push(setTimeout(() => {
        setTheyTyping(true);
        timeouts.current.push(setTimeout(() => {
          const line = STRANGER_LINES[Math.floor(Math.random() * STRANGER_LINES.length)];
          setTheyTyping(false);
          setMessages((m) => [...m, { id: crypto.randomUUID(), from: "them", text: line, time: Date.now() }]);
        }, 1400));
      }, 700));
    }, delay));
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "me", text, time: Date.now() }]);
    setInput("");
    // Stranger reply
    timeouts.current.push(setTimeout(() => setTheyTyping(true), 600));
    timeouts.current.push(setTimeout(() => {
      setTheyTyping(false);
      const replies = [
        "oh fr? tell me more",
        "haha okay i see you",
        "wait that's actually interesting",
        "lol same honestly",
        "okay random — what's your fav song rn?",
        "hmm... and then?",
        "you're kind of cool ngl 😏",
        "okay where in the world are you?",
      ];
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "them", text: replies[Math.floor(Math.random() * replies.length)], time: Date.now() }]);
    }, 1800 + Math.random() * 1500));
  }

  function skip() {
    clearTimers();
    setTheyTyping(false);
    setPartner(null);
    startSearch();
  }

  function endChat() {
    clearTimers();
    setTheyTyping(false);
    setPartner(null);
    setMessages([]);
    setPhase("setup");
  }

  return (
    <AppShell>
      <AmbientBackground />
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-strong rounded-3xl p-6 md:p-10"
            >
              <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
                Ready to <span className="neon-text">meet someone?</span>
              </h1>
              <p className="text-muted-foreground mb-8">Tell us a tiny bit about you and your vibe.</p>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">I am</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as Gender[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setMyGender(g)}
                        className={`py-3 rounded-2xl text-sm font-medium capitalize transition ${
                          myGender === g
                            ? "bg-gradient-primary text-primary-foreground glow-primary"
                            : "glass hover:bg-white/10"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Match me with</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "female", l: "Females" },
                      { v: "male", l: "Males" },
                      { v: "any", l: "Anyone" },
                    ] as const).map((p) => (
                      <button
                        key={p.v}
                        onClick={() => setPrefer(p.v)}
                        className={`py-3 rounded-2xl text-sm font-medium transition ${
                          prefer === p.v
                            ? "bg-gradient-primary text-primary-foreground glow-primary"
                            : "glass hover:bg-white/10"
                        }`}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startSearch}
                  className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2"
                >
                  <Shuffle className="h-5 w-5" /> Find someone now
                </button>
                <p className="text-xs text-center text-muted-foreground">
                  Be kind. Be curious. Don't be weird ✨
                </p>
              </div>
            </motion.div>
          )}

          {phase === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-strong rounded-3xl p-10 md:p-16 text-center"
            >
              <div className="relative mx-auto w-32 h-32 mb-8">
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" style={{ animationDelay: "0.7s" }} />
                <div className="relative h-32 w-32 rounded-full bg-gradient-primary flex items-center justify-center glow-neon">
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Searching for someone…</h2>
              <p className="text-muted-foreground mb-6">Scanning {Math.floor(Math.random() * 5000 + 8000).toLocaleString()} online users</p>
              <button onClick={endChat} className="text-sm text-muted-foreground underline hover:text-foreground transition">
                Cancel
              </button>
            </motion.div>
          )}

          {phase === "chatting" && partner && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={partner.avatar} alt="" className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-neon-pink p-0.5" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{partner.username}</p>
                      {partner.verified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
                      <span className="ml-1">{partner.flag}</span>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{partner.gender} · {partner.age} · {partner.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={skip} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/10 text-xs font-medium transition">
                    <SkipForward className="h-4 w-4" /> Skip
                  </button>
                  <button onClick={endChat} className="p-2 rounded-xl glass hover:bg-destructive/20 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
                <div className="text-center text-xs text-muted-foreground py-2">
                  <span className="px-3 py-1 glass rounded-full">You're now connected · say hi 👋</span>
                </div>
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
                    placeholder="Type something nice…"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
