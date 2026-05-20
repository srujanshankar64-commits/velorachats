import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shuffle, Compass, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

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
  useEffect(() => {
    if (!loading && user) nav({ to: "/random" });
  }, [user, loading, nav]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
          <span className="text-lg font-display font-bold neon-text">Velora</span>
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> Live · real people online now
        </div>
        <h1 className="text-4xl sm:text-6xl font-display font-bold leading-tight mb-4 max-w-xl">
          Meet someone <span className="neon-text">unforgettable</span>.
        </h1>
        <p className="text-muted-foreground mb-7 max-w-sm">
          Random text chat. Opposite-gender matching. Private DMs. Real strangers — in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link to="/auth" className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary">
            <Shuffle className="h-5 w-5" /> Start chatting <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" search={{ tab: "signup" } as never} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full glass-strong font-semibold">
            <Compass className="h-4 w-4" /> Create account
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Free · 13+ · Be kind</p>
      </section>

      <footer className="px-5 py-4 text-center text-[11px] text-muted-foreground">© 2026 Velora</footer>
    </div>
  );
}
