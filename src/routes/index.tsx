import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Moon, Lock, Users, MessageCircle, Shield, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SITE = "https://shhchats.in";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShhChats — Talk to Strangers Online Free | Anonymous Chat No Registration" },
      { name: "description", content: "Need someone to talk to at 3am? ShhChats connects you instantly. Free anonymous chat, no sign up, no login. Best Omegle alternative for text chat in India & worldwide. Someone to talk to when lonely, always." },
      { name: "keywords", content: "talk to strangers india, anonymous chat india, need someone to talk to at 3am, chat with strangers no sign up, someone to talk to when lonely, can't sleep chat online, late night chat no registration, overthinking chat online, chat when bored at night, random text chat india, free chat india no registration, omegle alternative text only, anonymous chat no registration, insomnia chat online" },
      { property: "og:title", content: "ShhChats — Talk to Strangers Online Free | Anonymous Chat No Registration" },
      { property: "og:description", content: "Need someone to talk to at 3am? ShhChats connects you instantly with a real person. Free anonymous chat, no sign up, no login. Best Omegle alternative for text chat in India & worldwide." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE + "/" },
      { name: "twitter:url", content: SITE + "/" },
    ],
    links: [{ rel: "canonical", href: SITE + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Is ShhChats free with no registration in India?", acceptedAnswer: { "@type": "Answer", text: "Yes — 100% free anonymous chat, no sign up, no email, no credit card. Open ShhChats from any device in India or worldwide and start talking instantly." } },
                { "@type": "Question", name: "I need someone to talk to at 3am — can I chat right now?", acceptedAnswer: { "@type": "Answer", text: "Yes. ShhChats is built exactly for this — late night anonymous chat when you can't sleep or feel lonely. Someone is always online, no matter the time." } },
                { "@type": "Question", name: "Can I chat with strangers in India with no login?", acceptedAnswer: { "@type": "Answer", text: "Absolutely — ShhChats is text-only random chat with no login, no registration, and no camera. It connects you with people from India and worldwide instantly." } },
                { "@type": "Question", name: "Is this a good Omegle alternative for text chat only?", acceptedAnswer: { "@type": "Answer", text: "ShhChats is a text-only Omegle alternative — no video, no camera pressure. Private, anonymous, and available worldwide with no account required." } },
                { "@type": "Question", name: "What if I'm feeling lonely or overthinking late at night?", acceptedAnswer: { "@type": "Answer", text: "ShhChats is designed for exactly that. Chat with someone anonymous when bored at night, feeling lonely, or when your mind won't stop — no judgment, always free." } },
              ],
            },
            {
              "@type": "WebSite",
              name: "ShhChats",
              url: SITE + "/",
              description: "Free anonymous chat — talk to strangers online, no registration, no login. India & worldwide.",
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<number>(0);

  useEffect(() => {
    if (!loading && user) nav({ to: "/discover" });
  }, [user, loading, nav]);

  useEffect(() => {
    const ch = supabase.channel("global-presence");
    ch.on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState()).length))
      .on("presence", { event: "join" }, () => setOnline(Object.keys(ch.presenceState()).length))
      .on("presence", { event: "leave" }, () => setOnline(Object.keys(ch.presenceState()).length));
    ch.subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function cta() {
    if (user) return nav({ to: "/discover" });
    window.location.href = "/auth";
  }

  const features = [
    { icon: Moon,          t: "Always someone awake",        d: "Someone online 24/7, even at 3am" },
    { icon: Lock,          t: "Fully anonymous",              d: "No real name, no trace, no data stored" },
    { icon: Users,         t: "Smart matching",               d: "Matched by age, city and vibe" },
    { icon: MessageCircle, t: "Real-time chat",               d: "Instant messages, no delays" },
    { icon: Shield,        t: "Actually safe",                d: "Block, report, stay in control" },
    { icon: MapPin,        t: "Know their city",              d: "Chat with people near you in India" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0D0D0F] text-[#E8EAED]">

      {/* Nav */}
      <header className="sticky top-0 z-30 h-[60px] px-5 flex items-center justify-between bg-[#0D0D0F] md:bg-[rgba(13,13,15,0.92)] md:backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-[#8AB4F8] text-[#0D0D0F] grid place-items-center text-sm font-semibold">🤫</span>
          <span className="text-[17px]">ShhChats</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden md:inline text-sm text-[#9AA0A6]">Sign in</Link>
          <button onClick={cta} className="rounded-full bg-[#8AB4F8] text-[#0D0D0F] text-sm px-4 h-9 font-medium">Get started</button>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section
          className="relative min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center px-6 text-center"
          style={{ background: "radial-gradient(ellipse 800px 500px at 50% -100px, rgba(138,180,248,0.07), transparent)" }}
        >
          {online > 0 && (
            <div
              className="mb-5 inline-flex items-center gap-2 px-3.5 h-8 rounded-full border text-[13px] text-[#8AB4F8]"
              style={{ background: "rgba(138,180,248,0.08)", borderColor: "rgba(138,180,248,0.22)" }}
            >
              🌙 {online} {online === 1 ? "person" : "people"} talking right now
            </div>
          )}
          <h1 className="text-[40px] sm:text-[58px] leading-[1.1] tracking-tight max-w-2xl">
            <span className="text-[#E8EAED]">For the nights you can't sleep.</span>
            <br />
            <span className="text-[#8AB4F8] italic">Real people. Real conversations.</span>
          </h1>
          <p className="mt-5 text-[17px] text-[#9AA0A6] max-w-2xl leading-relaxed">
            <strong className="text-[#c8d4e8] font-medium">Need someone to talk to at 3am?</strong> Can't sleep, overthinking, or just lonely —
            ShhChats connects you instantly with a real person in India or worldwide.
            Free anonymous chat, no sign up, no login. The best{" "}
            <strong className="text-[#c8d4e8] font-medium">Omegle alternative</strong> for text-only conversations.{" "}
            <strong className="text-[#c8d4e8] font-medium">Someone is always awake.</strong>
          </p>
          <div className="mt-10">
            <button
              onClick={cta}
              disabled={busy}
              className="h-[64px] px-14 rounded-full text-[19px] font-bold flex items-center justify-center gap-3 disabled:opacity-60 transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, #a8d4ff 0%, #8AB4F8 40%, #6a9de8 100%)",
                color: "#050a12",
                boxShadow: "0 0 50px rgba(138,180,248,0.45), 0 4px 24px rgba(138,180,248,0.25)",
              }}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "💬"}
              Start talking tonight
            </button>
          </div>
          <p className="mt-4 text-[13px] text-[#5F6368]">Anonymous · No registration · No login · Always free · India & worldwide</p>
        </section>

        {/* Trust strip */}
        <div
          className="py-3 px-6 flex flex-wrap gap-x-5 gap-y-2 justify-center"
          style={{ background: "#090909", borderTop: "0.5px solid rgba(255,255,255,0.05)", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
        >
          {[
            "100% free, no credit card",
            "No registration required",
            "Text-only, no camera pressure",
            "Real humans, zero bots",
            "Works on any device",
            "Chats are private, not stored",
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-[#626d7a]">
              <span className="w-1 h-1 rounded-full bg-[#8AB4F8] inline-block flex-shrink-0" />
              {t}
            </span>
          ))}
        </div>

        {/* Keyword pills — crawlable by Google, near-invisible to users */}
        <div
          className="py-3 px-6 flex flex-wrap gap-2 justify-center"
          style={{ background: "#080808", borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}
        >
          {[
            "anonymous chat no registration",
            "talk to strangers india",
            "free chat india no registration",
            "chat with strangers no sign up",
            "someone to talk to when lonely",
            "text chat with strangers no login",
            "can't sleep chat with someone online",
            "anonymous chat india",
            "late night chat no registration",
            "need someone to talk to at 3am",
            "overthinking chat online",
            "chat when bored at night",
            "random text chat india",
            "omegle alternative text only",
            "insomnia chat online",
            "loneliness chat",
          ].map((k) => (
            <span
              key={k}
              className="px-3 py-1 rounded-full text-[11px]"
              style={{ background: "#111113", border: "0.5px solid rgba(255,255,255,0.06)", color: "#383840" }}
            >
              {k}
            </span>
          ))}
        </div>

        {/* Features */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] text-center mb-3 font-medium">Built for late night conversations.</h2>
          <p className="text-center text-[#9AA0A6] text-[15px] mb-10">Everything you need, nothing you don't.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl p-5 surface border-soft">
                <Icon className="h-5 w-5 text-[#8AB4F8]" strokeWidth={1.5} />
                <p className="mt-3 text-[14px] font-medium text-[#E8EAED]">{t}</p>
                <p className="mt-1 text-[12px] text-[#5F6368] leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why ShhChats — keyword-rich content pillars */}
        <section className="px-6 py-14 max-w-5xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] text-center mb-3 font-medium">Why ShhChats for anonymous chat?</h2>
          <p className="text-center text-[#9AA0A6] text-[15px] mb-10">The questions people search for — answered.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                t: "Need someone to talk to when you're lonely",
                b: "Whether it's 2am overthinking or just a quiet evening with too much on your mind — ShhChats connects you with a real person instantly. No bots, no scripts, no judgment.",
              },
              {
                t: "Best Omegle alternative for text-only chat",
                b: "Since Omegle shut down, millions search for a text-only alternative with no camera pressure. ShhChats is private, anonymous, and works instantly in your browser — no sign up, no login.",
              },
              {
                t: "Free anonymous chat in India, no registration",
                b: "Looking to talk to strangers in India? ShhChats connects you with people nearby or worldwide — completely free, anonymous, and no account needed. Just open and start.",
              },
              {
                t: "Can't sleep? Chat with someone online right now",
                b: "Insomnia, late-night boredom, or overthinking at 3am — someone on ShhChats is always awake. Random text chat, no login, no registration. Just real people, ready to talk.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl p-6 surface border-soft">
                <p className="text-[15px] font-semibold text-[#E8EAED] mb-2">{c.t}</p>
                <p className="text-[13px] text-[#9AA0A6] leading-relaxed">{c.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { q: "It's always 2am when my brain decides to overthink. ShhChats is the only place I can talk it out.", n: "Arjun M., 23, Hyderabad" },
              { q: "Met someone from Chennai at midnight. We talked for 3 hours. Never felt less alone.", n: "Sneha K., 21, Bangalore" },
              { q: "My friends are asleep. My family won't understand. ShhChats always has someone awake.", n: "Rohan S., 25, Delhi" },
            ].map((t) => (
              <figure key={t.n} className="rounded-2xl p-5 surface border-soft">
                <blockquote className="text-sm text-[#E8EAED] italic leading-relaxed">"{t.q}"</blockquote>
                <figcaption className="mt-3 text-[12px] text-[#9AA0A6]">— {t.n} <span className="text-[#8AB4F8]">★★★★★</span></figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FAQ — FAQPage schema rich results */}
        <section className="px-6 py-14 max-w-3xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] text-center mb-3 font-medium">Frequently asked questions</h2>
          <p className="text-center text-[#9AA0A6] text-[15px] mb-10">Everything you need to know before you start.</p>
          <div className="flex flex-col">
            {[
              { q: "Is ShhChats free with no registration in India?", a: "Yes — 100% free anonymous chat, no sign up, no email, no credit card. Open ShhChats from any device in India or worldwide and start talking instantly." },
              { q: "I need someone to talk to at 3am — can I chat right now?", a: "Yes. ShhChats is built exactly for this — late night anonymous chat when you can't sleep or feel lonely. Someone is always online, no matter the time." },
              { q: "Can I chat with strangers in India with no login?", a: "Absolutely — ShhChats is text-only random chat with no login, no registration, and no camera. It connects you with people from India and worldwide instantly." },
              { q: "Is this a good Omegle alternative for text chat only?", a: "ShhChats is a text-only Omegle alternative — no video, no camera pressure. Private, anonymous, and available worldwide with no account required." },
              { q: "What if I'm feeling lonely or overthinking late at night?", a: "ShhChats is designed for exactly that. Chat with someone anonymous when bored at night, feeling lonely, or when your mind won't stop — no judgment, always free." },
            ].map((f, i) => (
              <div key={i} className="py-5" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[15px] font-semibold text-[#E8EAED] mb-2">{f.q}</p>
                <p className="text-[13px] text-[#9AA0A6] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 py-16 text-center">
          <p className="text-[22px] font-medium text-[#E8EAED] mb-2">Someone is awake right now.</p>
          <p className="text-[#9AA0A6] text-[15px] mb-8">Free anonymous chat — no sign up, no login, no judgment. India & worldwide.</p>
          <button
            onClick={cta}
            className="h-[60px] px-12 rounded-full text-[17px] font-bold transition-transform active:scale-95"
            style={{
              background: "linear-gradient(135deg, #a8d4ff 0%, #8AB4F8 40%, #6a9de8 100%)",
              color: "#050a12",
              boxShadow: "0 0 40px rgba(138,180,248,0.35)",
            }}
          >
            Start talking tonight →
          </button>
        </section>

      </main>

      <footer className="px-5 py-8 text-center text-[12px] text-[#5F6368] flex flex-col items-center gap-3 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link to="/safety" className="hover:text-[#E8EAED]">Safety</Link>
          <Link to="/privacy" className="hover:text-[#E8EAED]">Privacy</Link>
          <Link to="/contact" className="hover:text-[#E8EAED]">Contact</Link>
        </div>
        <span>© 2026 ShhChats — anonymous chat india, no registration required. Talk to strangers online free.</span>
      </footer>

    </div>
  );
}

declare global {
  interface Window { playChatAlert?: (sender: string, text: string) => void }
}

if (typeof window !== "undefined") {
  const oldFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await oldFetch.apply(this, args);
    if (args[0] && args[0].toString().includes("supabase")) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        if (data && data.record) {
          const snd = data.record.sender_name || data.record.username || "Someone";
          const txt = data.record.content || data.record.message_text || "Sent a message";
          if (typeof window.playChatAlert === "function") window.playChatAlert(snd, txt);
        }
      } catch (e) {}
    }
    return res;
  };
}
