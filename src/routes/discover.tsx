import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, Filter, MapPin, MessageCircle, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AmbientBackground } from "@/components/ambient-background";
import { FEED_USERS, type Gender } from "@/lib/mock-data";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Velora" },
      { name: "description", content: "Endlessly scroll real online profiles. Filter by gender, country, age and interests." },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [onlineOnly, setOnlineOnly] = useState(true);

  const filtered = useMemo(() => {
    return FEED_USERS.filter((u) => {
      if (onlineOnly && !u.online) return false;
      if (genderFilter !== "all" && u.gender !== genderFilter) return false;
      if (search && !u.username.toLowerCase().includes(search.toLowerCase()) &&
          !u.interests.some((i) => i.includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [search, genderFilter, onlineOnly]);

  return (
    <AppShell>
      <AmbientBackground />
      <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
              Discover <span className="neon-text">people</span>
            </h1>
            <p className="text-muted-foreground">{filtered.length} online · pick a vibe and say hi</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-strong rounded-2xl p-3 md:p-4 mb-8 flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center flex-1 min-w-[200px] glass rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or interest…"
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5 glass rounded-xl p-1">
            {(["all", "female", "male", "other"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition ${
                  genderFilter === g
                    ? "bg-gradient-primary text-primary-foreground glow-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
              onlineOnly ? "glass-strong text-foreground" : "glass text-muted-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
            Online only
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass text-muted-foreground hover:text-foreground transition">
            <Filter className="h-3.5 w-3.5" /> More filters
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((u, i) => (
              <motion.button
                key={u.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                whileHover={{ y: -4 }}
                onClick={() => navigate({ to: "/messages/$userId", params: { userId: u.id } })}
                className="group text-left glass rounded-3xl p-4 hover:glow-primary transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="relative">
                  <div className="relative mb-3">
                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-neon-pink/30 p-0.5">
                      <img
                        src={u.avatar}
                        alt={u.username}
                        loading="lazy"
                        className="w-full h-full rounded-2xl bg-background object-cover"
                      />
                    </div>
                    {u.online && (
                      <span className="absolute bottom-2 right-2 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 animate-ping" />
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-400 ring-2 ring-background" />
                      </span>
                    )}
                    <span className="absolute top-2 left-2 text-lg" title={u.country}>{u.flag}</span>
                  </div>

                  <div className="flex items-center gap-1 mb-1">
                    <p className="font-semibold text-sm truncate">{u.username}</p>
                    {u.verified && <BadgeCheck className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">{u.age} · {u.gender}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 italic">"{u.bio}"</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {u.interests.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {u.country.split(" ")[0]}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <MessageCircle className="h-3 w-3" /> chat
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No one matches that. Try fewer filters ✨</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
