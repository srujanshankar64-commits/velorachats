import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Moon, Lock, Users, MessageCircle, Shield, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SITE = "https://velorachats.velorachats.workers.dev";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShhChats — Late night conversations" },
      { name: "description", content: "ShhChats — late night anonymous chat. Talk to a real person when your mind won't stop. Free and anonymous." },
      { property: "og:title", content: "ShhChats — Late night conversations" },
      { property: "og:description", content: "Late night anonymous chat. Real people. Real conversations." },
      { property: "og:url", content: SITE + "/" },
      { name: "twitter:url", content: SITE + "/" },
    ],
    links: [{ rel: "canonical", href: SITE + "/" }],
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
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      nav({ to: "/discover" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start");
      setBusy(false);
    }
  }

  const features = [
    { icon: Moon, t: "Always someone awake" },
    { icon: Lock, t: "Fully anonymous" },
    { icon: Users, t: "Smart matching" },
    { icon: MessageCircle, t: "Real-time chat" },
    { icon: Shield, t: "Actually safe" },
    { icon: MapPin, t: "Know their city" },
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
            <span className="text-[#8AB4F8]">Real people. Real conversations.</span>
          </h1>
          <p className="mt-5 text-[17px] text-[#9AA0A6] max-w-xl">
            When it's late and your mind won't stop — someone on ShhChats is always awake. Anonymous, free, judgment-free.
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
              { n: "01", t: "Tell us about yourself", b: "Name, age, state. Takes 20 seconds." },
              { n: "02", t: "We find someone awake", b: "Matched in seconds to a real person." },
              { n: "03", t: "Talk the night away", b: "Anonymous, real-time, judgment-free." },
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
          <a href="https://omg10.com/4/11052130" target="_blank" rel="noopener" className="hover:text-[#E8EAED]">Advertise</a>
        </div>
        <span>© 2026 ShhChats. Late night conversations.</span>
      </footer>
    </div>
  );
}
