import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Discover,
});

type Profile = {
  id: string;
  username: string;
  name: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  is_online: boolean;
  gender?: string | null;
};

type Tab = "online" | "all" | "nearby";

function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Tab>("online");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [meState, setMeState] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(60);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const profilesRef = useRef<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("state").eq("id", user.id).single().then(({ data }) => {
      setMeState((data as { state?: string | null } | null)?.state ?? null);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setProfiles(null);
    let query = supabase
      .from("profiles")
      .select("id,username,name,age,city,state,is_online,gender")
      .neq("id", user.id)
      .limit(200);

    if (filter === "online") query = query.eq("is_online", true);
    if (filter === "nearby" && meState) query = query.eq("state", meState);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    if (ageMin > 18 || ageMax < 60) query = query.gte("age", ageMin).lte("age", ageMax);
    if (genderFilter !== "all") query = query.eq("gender", genderFilter);
    query
      .order("is_online", { ascending: false })
      .order("last_seen", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(error.message);
        const list = (data ?? []) as Profile[];
        profilesRef.current = list;
        setProfiles(list);
      });
    return () => { active = false; };
  }, [user, filter, q, meState, ageMin, ageMax, genderFilter]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("discover:presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        if (updated.id === user.id) return;
        setProfiles((prev) => {
          if (!prev) return prev;
          const existingIdx = prev.findIndex((p) => p.id === updated.id);
          if (filter === "online") {
            if (!updated.is_online) {
              if (existingIdx < 0) return prev;
              return prev.filter((_, i) => i !== existingIdx);
            } else {
              if (existingIdx >= 0) return prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p);
              const passesAge = (ageMin <= 18 && ageMax >= 60) || (updated.age != null && updated.age >= ageMin && updated.age <= ageMax);
              const passesGender = genderFilter === "all" || updated.gender === genderFilter;
              const passesSearch = !q.trim() || updated.username?.toLowerCase().includes(q.trim().toLowerCase());
              if (passesAge && passesGender && passesSearch) return [updated, ...prev];
              return prev;
            }
          }
          if (existingIdx >= 0) return prev.map((p) => p.id === updated.id ? { ...p, is_online: updated.is_online } : p);
          return prev;
        });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, filter, q, meState, ageMin, ageMax, genderFilter]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  const list = useMemo(() => profiles ?? [], [profiles]);
  const onlineCount = useMemo(() => list.filter((p) => p.is_online).length, [list]);
  const hasActiveFilter = genderFilter !== "all" || ageMin > 18 || ageMax < 60;

  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold warm-grad-text leading-none">Discover</h1>
          <button
            className="h-9 w-9 rounded-[12px] flex items-center justify-center relative"
            style={{ background: "#2e2418", border: "0.5px solid #3a2e1e" }}
            onClick={() => setShowFilters(true)}
          >
            <SlidersHorizontal className="h-4 w-4" style={{ color: "#f0ebe4" }} strokeWidth={1.5} />
            {hasActiveFilter && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#6dbf6a" }} />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 h-11 px-4 rounded-[16px] warm-input mb-3">
          <Search className="h-4 w-4" style={{ color: "#6e5e48" }} strokeWidth={1.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#6e5e48] text-[#f5f0ea]"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["online", "all", "nearby"] as const).map((f) => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} className="rounded-[20px] text-[13px]"
                style={{
                  padding: "7px 18px",
                  background: active ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#231d13",
                  color: active ? "#1a1410" : "#6e5e48",
                  fontWeight: active ? 600 : 500,
                  border: active ? "none" : "0.5px solid #33291a",
                }}>
                {f === "online" ? "Online" : f === "all" ? "Everyone" : "Nearby"}
              </button>
            );
          })}
        </div>

        {/* Count label */}
        <p className="warm-section-label mb-2 px-1">
          {filter === "online"
            ? `Active now · ${profiles ? `${list.length} online` : "loading…"}`
            : filter === "nearby"
            ? `Near you · ${profiles ? `${list.length} people` : "loading…"}`
            : `Everyone · ${profiles ? `${list.length} people (${onlineCount} online)` : "loading…"}`}
        </p>

        {/* List */}
        {profiles === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[78px] rounded-[20px] warm-card neo-shimmer" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: "#6e5e48" }}>
            {filter === "online" ? "Nobody online right now." : "No one here yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((p) => (
              <PersonCard key={p.id} p={p} onAction={() => openDM(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Filter bottom sheet */}
      {showFilters && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowFilters(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] p-6 pb-12"
            style={{ background: "#1c1610", border: "1px solid #3a2e1e" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full" style={{ background: "#3a2e1e" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[18px] font-bold" style={{ color: "#f5f0ea" }}>Filter People</span>
              <button
                onClick={() => { setGenderFilter("all"); setAgeMin(18); setAgeMax(60); }}
                className="text-[13px] px-3 py-1 rounded-[10px]"
                style={{ color: "#8a7460", background: "#2a2318", border: "0.5px solid #3e3222" }}
              >
                Reset
              </button>
            </div>

            {/* Gender cards */}
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#5e5040" }}>Show me</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {([
                { val: "all",    label: "Everyone", emoji: "👥" },
                { val: "male",   label: "Males",    emoji: "👦" },
                { val: "female", label: "Females",  emoji: "👧" },
              ] as const).map(({ val, label, emoji }) => {
                const active = genderFilter === val;
                return (
                  <button
                    key={val}
                    onClick={() => { setGenderFilter(val); setShowFilters(false); }}
                    className="flex flex-col items-center gap-1.5 py-4 rounded-[18px]"
                    style={{
                      background: active ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#231d13",
                      border: active ? "none" : "0.5px solid #33291a",
                      transform: active ? "scale(1.03)" : "scale(1)",
                      transition: "all 0.15s",
                    }}
                  >
                    <span className="text-[26px] leading-none">{emoji}</span>
                    <span className="text-[13px] font-semibold" style={{ color: active ? "#1a1410" : "#8a7460" }}>{label}</span>
                    {active && <span className="text-[10px]" style={{ color: "#3a8a38" }}>✓ Active</span>}
                  </button>
                );
              })}
            </div>

            {/* Age range */}
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#5e5040" }}>Age Range</p>
            <div className="rounded-[16px] p-4 mb-6" style={{ background: "#231d13", border: "0.5px solid #33291a" }}>
              <div className="flex justify-between mb-3">
                <span className="text-[14px]" style={{ color: "#f5f0ea" }}>Between</span>
                <span className="text-[14px] font-semibold" style={{ color: "#f0e8dc" }}>{ageMin} – {ageMax} yrs</span>
              </div>
              <input type="range" min={18} max={60} value={ageMin}
                onChange={(e) => setAgeMin(Math.min(+e.target.value, ageMax - 1))}
                className="w-full accent-[#f0e8dc] mb-2" />
              <input type="range" min={18} max={60} value={ageMax}
                onChange={(e) => setAgeMax(Math.max(+e.target.value, ageMin + 1))}
                className="w-full accent-[#f0e8dc]" />
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="w-full py-3.5 rounded-[16px] text-[15px] font-bold"
              style={{ background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410" }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PersonCard = memo(function PersonCard({ p, onAction }: { p: Profile; onAction: () => void }) {
  const displayName = p.name || p.username;
  const location = [p.city, p.state].filter(Boolean).join(", ") || p.state || "";
  return (
    <div
      className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow cursor-pointer active:opacity-80"
      onClick={onAction}
    >
      <UserAvatar id={p.id} name={displayName} online={p.is_online} size={46} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>
          {displayName}
          {p.age ? <span className="ml-1.5 text-[13px] font-normal" style={{ color: "#8a7460" }}>· {p.age}</span> : null}
        </p>
        {location && <p className="text-[12px] mt-0.5" style={{ color: "#6e5e48" }}>{location}</p>}
        <p className="text-[11px] mt-0.5" style={{ color: p.is_online ? "#6dbf6a" : "#5e5040" }}>
          {p.is_online ? "● Online" : "○ Offline"}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        className="rounded-[13px] text-[12px]"
        style={{ padding: "8px 15px", background: "#2a2318", color: "#f0ebe4", fontWeight: 600, border: "0.5px solid #3e3222" }}
      >
        + Add
      </button>
    </div>
  );
});
