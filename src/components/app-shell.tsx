import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Compass, Shuffle, User } from "lucide-react";

const items = [
  { to: "/random", label: "Chat", icon: Shuffle },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/messages", label: "DMs", icon: MessageCircle },
  { to: "/profile", label: "Me", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-56 z-40 flex-col glass-strong border-r border-border/40 px-3 py-6">
        <Link to="/random" className="flex items-center gap-2 px-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
          <span className="hidden lg:block text-lg font-display font-bold neon-text">Velora</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="hidden lg:block text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="md:pl-20 lg:pl-56 pb-16 md:pb-0 min-h-screen">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/40">
        <div className="flex justify-around items-center py-1.5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
