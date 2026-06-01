import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Users, MessageCircle, Hash, User } from "lucide-react";
import { useUnread } from "@/lib/unread";

const SIDE_ITEMS: ReadonlyArray<{ to: "/discover" | "/friends" | "/messages" | "/rooms" | "/profile"; label: string; icon: typeof Compass; showBadge?: boolean }> = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/messages", label: "Chats", icon: MessageCircle, showBadge: true },
  { to: "/rooms", label: "Rooms", icon: Hash },
  { to: "/profile", label: "Me", icon: User },
];

const NAV_LEFT = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/friends", label: "Friends", icon: Users },
] as const;

const NAV_RIGHT = [
  { to: "/rooms", label: "Rooms", icon: Hash },
  { to: "/profile", label: "Me", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { total } = useUnread();

  const inDmChat = /^\/messages\/[^/]+/.test(pathname);
  const inRandomChat = pathname === "/random";
  const inRoomChat = /^\/rooms\/[^/]+/.test(pathname);
  const hideNav = inDmChat || inRandomChat || inRoomChat;

  const isWarmRoute =
    pathname.startsWith("/discover") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/profile");

  const shellBg = isWarmRoute ? "warm-page" : "bg-black text-white";

  const centerActive = pathname === "/messages" || pathname.startsWith("/messages");

  return (
    <div className={`min-h-[100dvh] ${shellBg}`}>
      {/* Desktop sidebar */}
      {!hideNav && (
        <aside
          className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] z-40 flex-col px-3 py-6"
          style={{ background: isWarmRoute ? "#141008" : "#0A0A0A", borderRight: isWarmRoute ? "0.5px solid #262018" : "1px solid rgba(255,255,255,0.04)" }}
        >
          <Link to="/" className="flex items-center gap-2 px-3 mb-8">
            <span className="h-8 w-8 rounded-full warm-grad-bg grid place-items-center text-[15px] text-[#1a1410] font-semibold">🤫</span>
            <span className="text-base warm-grad-text font-semibold">ShhChats</span>
          </Link>
          <nav className="flex flex-col gap-0.5">
            {SIDE_ITEMS.map(({ to, label, icon: Icon, showBadge }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex items-center gap-3 px-3 h-11 rounded-full"
                  style={{
                    color: active ? "#1a1410" : isWarmRoute ? "#6e5e48" : "#888",
                    background: active ? (isWarmRoute ? "#201c14" : "#1C1C1E") : "transparent",
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-sm">{label}</span>
                  {showBadge && total > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full warm-grad-bg text-[10px] text-[#1a1410] font-semibold flex items-center justify-center">
                      {total > 99 ? "99+" : total}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-3 text-[11px] space-y-1" style={{ color: isWarmRoute ? "#5e5040" : "#555" }}>
            <Link to="/safety" className="block">Safety</Link>
            <Link to="/privacy" className="block">Privacy</Link>
            <Link to="/contact" className="block">Contact</Link>
          </div>
        </aside>
      )}

      <main className={`${hideNav ? "" : "md:pl-[240px] pb-[78px] md:pb-0"} min-h-[100dvh]`}>{children}</main>

      {/* Mobile bottom nav with center button */}
      {!hideNav && (
        <nav
          className="md:hidden fixed bottom-3 left-3 right-3 z-50 bg-white border border-gray-200 rounded-3xl"
          style={{ paddingTop: 10, paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
        >
          <div className="grid grid-cols-5 items-end px-2">
            {NAV_LEFT.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center gap-1 py-1"
                  style={{ color: active ? "#1a1410" : "#9ca3af" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}

            <Link
              to="/messages"
              className="flex flex-col items-center"
              style={{ marginTop: -10 }}
              aria-label="Messages"
            >
              <span
                className="h-12 w-12 rounded-full warm-grad-bg flex items-center justify-center relative"
                style={{ boxShadow: "4px 4px 10px rgba(0,0,0,0.5), -1px -1px 4px rgba(255,255,255,0.05)" }}
              >
                <MessageCircle className="h-5 w-5" style={{ color: "#1a1410" }} strokeWidth={2} />
                {total > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e84545] text-[10px] text-white font-semibold flex items-center justify-center">
                    {total > 9 ? "9+" : total}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium mt-1" style={{ color: centerActive ? "#1a1410" : "#9ca3af" }}>Chat</span>
            </Link>

            {NAV_RIGHT.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center gap-1 py-1"
                  style={{ color: active ? "#1a1410" : "#9ca3af" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex justify-center mt-3">
            <span className="block" style={{ width: 100, height: 4, background: "#2e2618", borderRadius: 2 }} />
          </div>
        </nav>
      )}
    </div>
  );
}
