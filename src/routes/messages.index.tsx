import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmbientBackground } from "@/components/ambient-background";
import { RECENT_CHATS } from "@/lib/mock-data";

export const Route = createFileRoute("/messages/")({
  head: () => ({ meta: [{ title: "Messages — Velora" }] }),
  component: MessagesList,
});

function MessagesList() {
  return (
    <AppShell>
      <AmbientBackground />
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
          Your <span className="neon-text">messages</span>
        </h1>
        <p className="text-muted-foreground mb-6">Pick up where you left off</p>

        <div className="glass rounded-2xl flex items-center px-4 py-3 mb-6">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <input placeholder="Search conversations…" className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground" />
        </div>

        <div className="space-y-2">
          {RECENT_CHATS.map(({ user, lastMessage, unread, time }) => (
            <Link
              key={user.id}
              to="/messages/$userId"
              params={{ userId: user.id }}
              className="group flex items-center gap-3 p-3 rounded-2xl glass hover:glow-primary hover:bg-white/8 transition-all"
            >
              <div className="relative shrink-0">
                <img src={user.avatar} alt="" className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-neon-pink p-0.5" />
                {user.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-sm truncate">{user.username} <span>{user.flag}</span></p>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{time}</span>
                </div>
                <p className={`text-xs truncate ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {lastMessage}
                </p>
              </div>
              {unread > 0 && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-gradient-primary text-[10px] font-bold flex items-center justify-center glow-primary">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </div>

        {RECENT_CHATS.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No messages yet. Go meet someone!</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
