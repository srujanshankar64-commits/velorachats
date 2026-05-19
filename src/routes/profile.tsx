import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Settings, Edit3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmbientBackground } from "@/components/ambient-background";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Velora" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const me = {
    username: "you_",
    bio: "just here to vibe ✨ midnight thinker, coffee obsessed",
    country: "Somewhere cool",
    flag: "🌍",
    age: 22,
    gender: "—",
    interests: ["music", "lofi", "coding", "anime", "coffee"],
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=you&backgroundColor=transparent",
  };

  return (
    <AppShell>
      <AmbientBackground />
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
        <div className="relative glass-strong rounded-3xl overflow-hidden">
          {/* Banner */}
          <div className="h-40 md:h-56 bg-gradient-primary animate-gradient relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.7_0.25_350/0.4),transparent_60%)]" />
            <button className="absolute top-4 right-4 p-2 rounded-xl glass-strong hover:bg-white/20 transition">
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {/* Avatar + info */}
          <div className="px-6 pb-6 -mt-14 md:-mt-16 relative">
            <div className="flex items-end justify-between mb-4">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-3xl bg-gradient-to-br from-primary to-neon-pink p-1 glow-neon">
                <img src={me.avatar} alt="" className="h-full w-full rounded-3xl bg-background object-cover" />
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold glow-primary hover:scale-105 transition">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold">{me.username}</h1>
              <BadgeCheck className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              {me.age} · {me.gender} · <MapPin className="h-3.5 w-3.5" /> {me.flag} {me.country}
            </p>
            <p className="text-foreground mb-5 italic">"{me.bio}"</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {me.interests.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full glass">#{tag}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Chats", value: "127" },
                { label: "Connections", value: "42" },
                { label: "Vibe score", value: "98" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4 text-center">
                  <p className="text-2xl font-display font-bold neon-text">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
