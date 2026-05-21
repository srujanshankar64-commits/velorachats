import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shuffle, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velora — Random chat with real people" },
      { name: "description", content: "Match instantly with real people. Free, fast, anonymous-friendly text chat." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Authenticated users land straight on Discover (home)
    if (!loading && user) nav({ to: "/discover" });
  }, [user, loading, nav]);

  async function continueAsGuest() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      toast.success("You're in ✨");
      nav({ to: "/discover" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start guest session";
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
          <span className="text-lg font-display font-bold neon-text">Velora</span>
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> Live · real people online now
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-3 max-w-xl">
          Meet someone <span className="neon-text">unforgettable</span>.
        </h1>
        <p className="text-muted-foreground text-sm mb-7 max-w-sm">
          Tap and chat. No verification. No fuss.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button onClick={continueAsGuest} disabled={busy} className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
            Continue as guest <ArrowRight className="h-4 w-4" />
          </button>
          <Link to="/auth" className="inline-flex items-center justify-center px-6 py-3 rounded-2xl glass-strong font-medium text-sm">
            Or use email
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Free · 13+ · Be kind</p>
      </section>

      <footer className="px-5 py-3 text-center text-[11px] text-muted-foreground">© 2026 Velora</footer>
    </div>
  );
}
