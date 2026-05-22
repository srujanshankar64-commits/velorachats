import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Compass, Shuffle, User } from "lucide-react";
import { useUnread } from "@/lib/unread";

const items: Array<{ to: "/messages" | "/discover" | "/random" | "/profile"; label: string; icon: typeof Compass; showBadge?: boolean }> = [
  { to: "/messages", label: "Chats", icon: MessageCircle, showBadge: true },
  { to: "/random", label: "Random", icon: Shuffle },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/profile", label: "Me", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { total } = useUnread();

  const inDmChat = /^\/messages\/[^/]+/.test(pathname);
  const inRandomChat = pathname === "/random";
  const hideNav = inDmChat || inRandomChat;

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {!hideNav && (
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] z-40 flex-col bg-[#0A0A0A] px-3 py-6">
          <Link to="/" className="flex items-center gap-2 px-3 mb-8">
            <span className="text-[20px] text-[#7C3AED]">V</span>
            <span className="text-base text-white">Velora</span>
          </Link>
          <nav className="flex flex-col gap-0.5">
            {items.map(({ to, label, icon: Icon, showBadge }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link key={to} to={to} className={`relative flex items-center gap-3 px-3 h-11 rounded-full transition-opacity duration-200 ${active ? "bg-[#1C1C1E] text-white" : "text-[#888] hover:text-white"}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-sm">{label}</span>
                  {showBadge && total > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#7C3AED] text-[10px] text-white flex items-center justify-center">{total > 99 ? "99+" : total}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <main className={`${hideNav ? "" : "md:pl-[240px] pb-[64px] md:pb-0"} min-h-[100dvh]`}>{children}</main>

      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16">
            {items.map(({ to, label, icon: Icon, showBadge }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link key={to} to={to} className={`relative flex flex-col items-center gap-1 px-4 py-1 transition-opacity duration-200 ${active ? "text-[#7C3AED]" : "text-[#888]"}`}>
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    {showBadge && total > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#7C3AED] text-[9px] text-white flex items-center justify-center">{total > 9 ? "9+" : total}</span>
                    )}
                  </div>
                  <span className="text-[10px]">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
