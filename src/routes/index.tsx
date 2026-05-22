import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, Eye, Shield, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velora — Chat with real people" },
      { name: "description", content: "Meet strangers instantly. Free anonymous text chat with gender matching and read receipts." },
      { property: "og:title", content: "Velora — Chat with real people" },
      { property: "og:description", content: "Meet strangers instantly. Free anonymous text chat." },
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
    if (!loading && user) nav({ to: "/messages" });
  }, [user, loading, nav]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_online", true);
      if (alive && typeof count === "number") setOnline(Math.max(count, 1));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function startChatting() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      nav({ to: "/random" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-white">
      <header className="h-14 px-5 flex items-center justify-between">
        <Link to="/" className="text-[20px] text-[#7C3AED]">V</Link>
        <Link to="/auth" className="text-sm text-[#888]">Sign in</Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-4">
        <h1 className="text-[44px] sm:text-[56px] leading-[1.05] tracking-tight text-white max-w-xl">
          Meet someone real.
        </h1>
        <p className="mt-3 text-[16px] text-[#888]">Instant. Anonymous. Text only.</p>

        <div className="mt-5 flex items-center gap-2 text-[#22C55E] text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E] pulse-dot" />
          {online.toLocaleString()} people online right now
        </div>
        <p className="mt-2 text-[12px] text-[#888]">24,500 chats started · 96 people joined this week</p>

        <button
          onClick={startChatting}
          disabled={busy}
          className="mt-8 w-full max-w-[360px] h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 transition-opacity duration-200 disabled:opacity-60 active:opacity-80"
        >
          {busy ? <Loader2 className="h-5 w-5 spin-slow" /> : null}
          Start chatting free
        </button>
        <p className="mt-2.5 text-[12px] text-[#888]">No account needed · Free forever · 13+</p>

        <div className="mt-10 grid grid-cols-3 gap-6 max-w-sm w-full">
          {[
            { icon: Users, label: "Gender matching" },
            { icon: Eye, label: "Read receipts" },
            { icon: Shield, label: "No bots" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-5 w-5 text-[#7C3AED]" strokeWidth={1.5} />
              <span className="text-[12px] text-[#888]">{label}</span>
            </div>
          ))}
        </div>

        <div id="mockup-preview" className="mt-10 w-[280px] aspect-[9/16] max-h-[280px] rounded-[36px] border border-[#1C1C1E] bg-[#0A0A0A] flex items-center justify-center">
          <span className="text-[#333] text-xs">Preview</span>
        </div>
      </main>

      <footer className="px-5 py-4 text-center text-[12px] text-[#555]">
        © 2026 Velora · Safe · Moderated ·{" "}
        <Link to="/safety" className="text-[#888]">Safety</Link> ·{" "}
        <Link to="/safety" className="text-[#888]">Privacy</Link>
      </footer>
    </div>
  );
}
