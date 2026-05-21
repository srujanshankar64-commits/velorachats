import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Compass, Shuffle, User } from "lucide-react";
import { useUnread } from "@/lib/unread";

const items: Array<{ to: "/discover" | "/random" | "/messages" | "/profile"; label: string; icon: typeof Compass; showBadge?: boolean }> = [
  { to: "/discover", label: "Home", icon: Compass },
  { to: "/random", label: "Random", icon: Shuffle },
  { to: "/messages", label: "Chats", icon: MessageCircle, showBadge: true },
  { to: "/profile", label: "Me", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { total } = useUnread();

  // Hide bottom/side nav on full-screen chat surfaces
  const inDmChat = /^\/messages\/[^/]+/.test(pathname);
  const hideNav = inDmChat;

  return (
    <div className="min-h-[100dvh]">
      {/* Desktop sidebar */}
      {!hideNav && (
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-56 z-40 flex-col bg-background border-r border-border/40 px-3 py-6">
          <Link to="/discover" className="flex items-center gap-2 px-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
            <span className="hidden lg:block text-lg font-display font-bold neon-text">Velora</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {items.map(({ to, label, icon: Icon, showBadge }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link key={to} to={to} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}>
                  <div className="relative">
                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : ""}`} />
                    {showBadge && total > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">{total > 99 ? "99+" : total}</span>
                    )}
                  </div>
                  <span className="hidden lg:block text-sm font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <main className={`${hideNav ? "" : "md:pl-20 lg:pl-56 pb-16 md:pb-0"} min-h-[100dvh]`}>{children}</main>

      {/* Mobile bottom nav — fully opaque, hidden during DM chat */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center py-1.5">
            {items.map(({ to, label, icon: Icon, showBadge }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link key={to} to={to} className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && total > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">{total > 99 ? "99+" : total}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
