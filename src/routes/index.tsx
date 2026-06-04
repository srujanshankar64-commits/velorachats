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
      { title: "ShhChats — Anonymous Chat & Talk to Strangers (No Login)" },
      { name: "description", content: "Talk to strangers online free on ShhChats. The ultimate anonymous chat website with no login or registration. Connect with real people in safe late night chat rooms." },
      { property: "og:title", content: "ShhChats — Anonymous Chat & Talk to Strangers" },
      { property: "og:description", content: "Talk to strangers online free with no login. Join secure late night chat rooms instantly." },
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
              "@type": "Organization",
              name: "ShhChats",
              url: SITE + "/",
              logo: SITE + "/favicon.svg",
              sameAs: [],
              description: "ShhChats is an anonymous late-night chat app that matches awake users in real time.",
            },
            {
              "@type": "WebSite",
              name: "ShhChats",
              url: SITE + "/",
              description: "Late night anonymous chat with real people. Free, private, judgment-free.",
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

  // Presence-based live count
  useEffect(() => {
    const ch = supabase.channel("global-presence");
    ch.on("presence", { event: "sync" }, () => {
      setOnline(Object.keys(ch.presenceState()).length);
    })
    .on("presence", { event: "join" }, () => {
      setOnline(Object.keys(ch.presenceState()).length);
    })
    .on("presence", { event: "leave" }, () => {
      setOnline(Object.keys(ch.presenceState()).length);
    });
    ch.subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, []);

  async function cta() {
    if (user) return nav({ to: "/discover" });
    window.location.href = "/auth";
  }

  const features = [
    { icon: Moon, t: "Late night chat rooms" },
    { icon: Lock, t: "Anonymous chat no login" },
    { icon: Users, t: "Smart stranger matching" },
    { icon: MessageCircle, t: "Talk to strangers online free" },
    { icon: Shield, t: "Safe Omegle alternative" },
    { icon: MapPin, t: "Chat with strangers by city" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0D0D0F] text-[#E8EAED]">
      <header className="sticky top-0 z-30 h-[60px] px-5 flex items-center justify-between bg-[#0D0D0F] md:bg-[rgba(13,13,15,0.92)] md:backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] glass">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-[#8AB4F8] text-[#0D0D0F] grid place-items-center text-sm font-semibold" >🤫</span>
          <span className="text-[17px]">ShhChats</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden md:inline text-sm text-[#9AA0A6]">Sign in</Link>
          <button onClick={cta} className="rounded-full bg-[#8AB4F8] text-[#0D0D0F] text-sm px-4 h-9">Get started</button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center px-6 text-center"
          style={{ background: "radial-gradient(ellipse 800px 500px at 50% -100px, rgba(138,180,248,0.06), transparent)" }}>
          {online > 0 && (
            <div className="mb-5 inline-flex items-center gap-2 px-3.5 h-8 rounded-full bg-accent-soft border border-[rgba(138,180,248,0.20)] text-[13px] text-[#8AB4F8]">
              🌙 {online} {online === 1 ? "person" : "people"} talking right now
            </div>
          )}
          <h1 className="text-[40px] sm:text-[56px] leading-[1.1] tracking-tight max-w-2xl">
            <span className="text-[#E8EAED]">For the nights you can't sleep.</span>
            <br />
            <span className="text-[#8AB4F8]">Anonymous Chat. No Login.</span>
          </h1>
          <p className="mt-5 text-[17px] text-[#9AA0A6] max-w-xl">
            Want to <strong>talk to strangers online free</strong>? ShhChats connects you to active <strong>late night chat rooms</strong> instantly. Safe, free, and 100% anonymous with no registration required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto">
            <button onClick={cta} disabled={busy}
              className="h-[52px] px-7 rounded-full bg-[#8AB4F8] text-[#0D0D0F] text-base flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 spin-slow" /> : null}
              Start talking tonight
            </button>
            <a href="#how" className="h-[52px] px-7 rounded-full border border-[rgba(255,255,255,0.14)] text-[#E8EAED] text-base flex items-center justify-center">
              How it works
            </a>
          </div>
          <p className="mt-5 text-[13px] text-[#5F6368]">Anonymous · Always awake · No judgment</p>
        </section>

        {/* Features */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] text-center mb-10">Built for late night conversations.</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map(({ icon: Icon, t }) => (
              <div key={t} className="rounded-2xl p-5 surface border-soft">
                <Icon className="h-5 w-5 text-[#8AB4F8]" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-[#E8EAED]">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] text-center mb-10">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { n: "01", t: "No registration required", b: "No login, no email. Enter your details in 10 seconds." },
              { n: "02", t: "Find someone awake", b: "Matched in seconds to real people online." },
              { n: "03", t: "Anonymous chat free", b: "Talk the night away in private chat rooms." },
            ].map((s) => (
              <li key={s.n} className="relative rounded-2xl p-6 surface border-soft overflow-hidden">
                <span className="absolute -top-2 right-3 text-[64px] font-semibold text-[#8AB4F8] opacity-[0.08] leading-none select-none">{s.n}</span>
                <p className="text-sm text-[#E8EAED]">{s.t}</p>
                <p className="mt-2 text-[13px] text-[#9AA0A6]">{s.b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
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
      </main>

      <footer className="px-5 py-8 text-center text-[12px] text-[#5F6368] flex flex-col items-center gap-3 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link to="/safety" className="hover:text-[#E8EAED]">Safety</Link>
          <Link to="/privacy" className="hover:text-[#E8EAED]">Privacy</Link>
          <Link to="/contact" className="hover:text-[#E8EAED]">Contact</Link>
        </div>
        <span>© 2026 ShhChats. Late night conversations.</span>
      </footer>
    </div>
  );
}

declare global {
  interface Window { playChatAlert?: (sender: string, text: string) => void }
}

if (typeof window !== 'undefined') {
  const oldFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await oldFetch.apply(this, args);
    if (args[0] && args[0].toString().includes('supabase')) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        if (data && data.record) {
          const snd = data.record.sender_name || data.record.username || 'Someone';
          const txt = data.record.content || data.record.message_text || 'Sent a message';
          if (typeof window.playChatAlert === 'function') window.playChatAlert(snd, txt);
        }
      } catch (e) {}
    }
    return res;
  };
}