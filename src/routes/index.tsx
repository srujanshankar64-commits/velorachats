import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velora — Meet real people, chat instantly" },
      { name: "description", content: "Free, safe chat to meet real people near you. Discover by city, join public rooms, message privately. No bots." },
      { property: "og:title", content: "Velora — Meet real people, chat instantly" },
      { property: "og:description", content: "Free, safe chat to meet real people near you." },
      { property: "og:image", content: "/logo.jpg" },
      { name: "twitter:image", content: "/logo.jpg" },
      { property: "og:url", content: "https://velorachats.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://velorachats.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<number>(1200);

  useEffect(() => {
    if (!loading && user) nav({ to: "/discover" });
  }, [user, loading, nav]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true);
      if (alive && typeof count === "number") setOnline(Math.max(count, 1));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-white">
      <header className="h-14 px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Velora" width={28} height={28} className="h-7 w-7 rounded-full" />
          <span className="text-base">Velora</span>
        </Link>
        <Link to="/auth" className="text-sm text-[#888]">Sign in</Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 text-center">
        <section className="pt-6 pb-10 flex flex-col items-center">
          <h1 className="text-[40px] sm:text-[56px] leading-[1.05] tracking-tight max-w-xl">Meet someone real.</h1>
          <p className="mt-3 text-[16px] text-[#888]">Instant. Anonymous. Text only.</p>

          <div className="mt-5 flex items-center gap-2 text-[#22C55E] text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E] pulse-dot" />
            {online.toLocaleString()} people online right now
          </div>

          <button onClick={cta} disabled={busy} className="mt-8 w-full max-w-[360px] h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-60 active:opacity-80">
            {busy ? <Loader2 className="h-5 w-5 spin-slow" /> : null}
            Start chatting free
          </button>
          <p className="mt-2.5 text-[12px] text-[#888]">No account needed · Free forever · 13+</p>
        </section>

        <section className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3 pb-10">
          {[
            { icon: Users, title: "Real People", body: "Verified by activity, not bots." },
            { icon: ShieldCheck, title: "Safe & Moderated", body: "Block and report in one tap." },
            { icon: MapPin, title: "Find Your City", body: "Discover people near you first." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-[#1C1C1E] p-5 text-left">
              <Icon className="h-5 w-5 text-[#7C3AED]" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-white">{title}</p>
              <p className="mt-1 text-[12px] text-[#888]">{body}</p>
            </div>
          ))}
        </section>

        <section className="w-full max-w-3xl pb-10">
          <h2 className="text-[18px] text-left mb-4">How it works</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              { n: "1", t: "Sign up", b: "Guest or email — instant." },
              { n: "2", t: "Set your city", b: "We show people nearby first." },
              { n: "3", t: "Start chatting", b: "DM or join a public room." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl bg-[#1C1C1E] p-5">
                <span className="text-[#7C3AED] text-sm">Step {s.n}</span>
                <p className="mt-1 text-sm">{s.t}</p>
                <p className="mt-1 text-[12px] text-[#888]">{s.b}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="px-5 py-6 text-center text-[12px] text-[#666] flex flex-wrap justify-center gap-x-3 gap-y-2">
        <Link to="/discover" className="hover:text-white">Discover</Link>·
        <Link to="/rooms" className="hover:text-white">Rooms</Link>·
        <Link to="/safety" className="hover:text-white">Safety</Link>·
        <a href="https://www.termsfeed.com/live/1e0211fa-64de-478c-a7d9-bdd1e79c7d11" target="_blank" rel="noopener noreferrer" className="hover:text-white">Privacy</a>·
        <a href="https://www.termsfeed.com/live/82620bf7-04c5-4f57-ac5f-7ef3f8e56a29" target="_blank" rel="noopener noreferrer" className="hover:text-white">Terms</a>·
        <Link to="/contact" className="hover:text-white">Contact</Link>
        <span className="w-full text-[#444] mt-2">© 2026 Velora</span>
      </footer>
    </div>
  );
}
