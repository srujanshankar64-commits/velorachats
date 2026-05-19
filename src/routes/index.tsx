import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shuffle, Compass, MessageCircle, Sparkles, Shield, Zap, Globe, ArrowRight, Heart } from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velora — Meet new people instantly" },
      { name: "description", content: "A premium real-time random chat platform. Match with strangers, discover profiles, and start private conversations." },
      { property: "og:title", content: "Velora — Meet new people instantly" },
      { property: "og:description", content: "Glassmorphic, neon-accented random chat. Text, match, discover." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AmbientBackground />

      {/* Top nav */}
      <header className="relative z-20 px-6 md:px-12 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary glow-primary flex items-center justify-center font-bold text-lg">V</div>
          <span className="text-xl font-display font-bold neon-text">Velora</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <Link
          to="/random"
          className="px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold hover:scale-105 transition glow-primary"
        >
          Start chatting
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-6">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              12,847 people online right now
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05] mb-6">
              Meet someone <br />
              <span className="neon-text">unforgettable</span><br />
              tonight.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
              Random text chat with real people, opposite-gender matching, and a
              discovery feed that actually feels alive.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/random"
                className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary hover:scale-105 transition"
              >
                <Shuffle className="h-5 w-5" />
                Start random chat
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full glass-strong font-semibold hover:bg-white/10 transition"
              >
                <Compass className="h-5 w-5" />
                Browse profiles
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              No signup needed · Guest mode · End-to-end private
            </p>
          </motion.div>

          {/* Animated chat mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative glass-strong rounded-3xl p-6 glow-neon">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-neon-pink to-primary" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">aria_22 🇯🇵</p>
                    <p className="text-xs text-green-400">online · typing…</p>
                  </div>
                </div>
                <Heart className="h-5 w-5 text-neon-pink" />
              </div>

              <div className="space-y-3 mb-4">
                <ChatBubble side="them" delay={0.4}>hey :) what brings you here tonight?</ChatBubble>
                <ChatBubble side="me" delay={1.0}>honestly just looking for a real convo</ChatBubble>
                <ChatBubble side="them" delay={1.6}>okay i love that. tell me one weird thing about you</ChatBubble>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="flex gap-1.5 ml-2"
                >
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
                </motion.div>
              </div>

              <div className="glass rounded-full px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Type a message…</span>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 glass-strong rounded-2xl px-4 py-3 animate-float">
              <p className="text-xs text-muted-foreground">Matched in</p>
              <p className="font-display font-bold text-lg neon-text">0.8s</p>
            </div>
            <div className="absolute -bottom-6 -left-6 glass-strong rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex -space-x-2 mb-1">
                {["bg-neon-pink", "bg-accent", "bg-primary"].map((c, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full ${c} ring-2 ring-background`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">+12k online</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-4">
          Built for <span className="neon-text">real conversations</span>
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
          Every detail is designed to make meeting strangers feel safe, smooth, and a little magical.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Shuffle, title: "Smart matching", desc: "Opposite-gender priority and interest-based pairing with sub-second connections." },
            { icon: Compass, title: "Discovery feed", desc: "Endless scroll of online profiles. Filter by country, age, and vibe." },
            { icon: MessageCircle, title: "Private DMs", desc: "Keep the spark going. Read receipts, typing status, reactions, the works." },
            { icon: Zap, title: "Instant & real-time", desc: "Built on websockets. Messages land before you finish the thought." },
            { icon: Shield, title: "AI safety", desc: "Toxicity detection, spam filters, and one-tap reporting keep things kind." },
            { icon: Globe, title: "Global by default", desc: "Chat across 180+ countries with region-optimized latency." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group glass rounded-3xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:glow-primary transition">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-4xl mx-auto glass-strong rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 animate-gradient" />
          <div className="relative">
            <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Your next favorite person <br /> is one click away.
            </h2>
            <p className="text-muted-foreground mb-8">No signup. No friction. Just press the button.</p>
            <Link
              to="/random"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary hover:scale-105 transition"
            >
              <Shuffle className="h-5 w-5" /> Start chatting now
            </Link>
          </div>
        </div>
      </section>

      <footer id="faq" className="relative z-10 border-t border-border/40 px-6 md:px-12 py-10 text-center text-sm text-muted-foreground">
        <p>© 2026 Velora · Be kind out there ✨</p>
      </footer>
    </div>
  );
}

function ChatBubble({ side, delay, children }: { side: "me" | "them"; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex ${side === "me" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          side === "me"
            ? "bg-gradient-primary text-primary-foreground rounded-br-md"
            : "glass rounded-bl-md"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
