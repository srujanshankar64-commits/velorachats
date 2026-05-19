import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Compass, Shuffle, User, Sparkles } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Sparkles },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/random", label: "Random Chat", icon: Shuffle },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-64 z-40 flex-col glass-strong border-r border-border/40 px-3 py-6">
        <Link to="/" className="flex items-center gap-2 px-2 mb-10">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary glow-primary flex items-center justify-center font-bold text-lg">V</div>
          <span className="hidden lg:block text-xl font-display font-bold neon-text">Velora</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground glow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""}`} />
                <span className="hidden lg:block text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden lg:block glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-2">Live now</p>
          <p className="text-2xl font-display font-bold neon-text">12,847</p>
          <p className="text-xs text-muted-foreground">people chatting</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/40">
        <div className="flex justify-around items-center py-2 px-1 safe-area-bottom">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_oklch(0.7_0.25_300)]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="md:pl-20 lg:pl-64 pb-20 md:pb-0 min-h-screen">{children}</main>
    </div>
  );
}
