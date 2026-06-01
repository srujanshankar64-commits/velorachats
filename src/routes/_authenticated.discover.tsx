import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
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
  const [distFilter, setDistFilter] = useState<"all" | "nearby">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");

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
      .limit(80);
    if (filter === "online") query = query;
    if (filter === "nearby" && meState) query = query.eq("state", meState);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    if (ageMin > 18 || ageMax < 60) query = query.gte("age", ageMin).lte("age", ageMax);
    if (distFilter === "nearby" && meState) query = query.eq("state", meState);
    if (genderFilter !== "all") query = query.eq("gender", genderFilter);
    query.order("is_online", { ascending: false }).order("last_seen", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      setProfiles((data ?? []) as Profile[]);
    });
    return () => { active = false; };
  }, [user, filter, q, meState]);

  const list = useMemo(() => profiles ?? [], [profiles]);
  const onlineCount = useMemo(() => list.filter((p) => p.is_online).length, [list]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold warm-grad-text leading-none">Discover</h1>
          <button
            className="h-9 w-9 rounded-[12px] flex items-center justify-center"
            style={{ background: "#2e2418", border: "0.5px solid #3a2e1e" }}
            aria-label="Filters"
          onClick={() => setShowFilters(true)}
        >
            <SlidersHorizontal className="h-4 w-4" style={{ color: "#f0ebe4" }} strokeWidth={1.5} />
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

        {/* Segment */}
        <div className="flex gap-2 mb-4">
          {(["online", "all", "nearby"] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-[20px] text-[13px]"
                style={{
                  padding: "7px 18px",
                  background: active ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#231d13",
                  color: active ? "#1a1410" : "#6e5e48",
                  fontWeight: active ? 600 : 500,
                  border: active ? "none" : "0.5px solid #33291a",
                }}
              >
                {f === "online" ? "Online" : f === "all" ? "Everyone" : "Nearby"}
              </button>
            );
          })}
        </div>

        {/* Section label */}
        <p className="warm-section-label mb-2 px-1">
          {filter === "online" ? "Active now" : filter === "nearby" ? "Near you" : "Everyone"} · {profiles ? `${filter === "online" ? onlineCount : list.length} people` : "loading…"}
        </p>

        {profiles === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[78px] rounded-[20px] warm-card neo-shimmer" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: "#6e5e48" }}>No one here right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((p, idx) => (
              <PersonCard key={p.id} p={p} primaryAction={idx === 0} onAction={() => openDM(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
      {showFilters && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowFilters(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] p-6 pb-10"
            style={{ background: "#1c1610", border: "1px solid #3a2e1e" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full" style={{ background: "#3a2e1e" }} />
            </div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[18px] font-bold" style={{ color: "#f5f0ea" }}>Filters</span>
              <button onClick={() => { setAgeMin(18); setAgeMax(60); setDistFilter("all"); setGenderFilter("all"); }} className="text-[13px]" style={{ color: "#8a7460" }}>Reset</button>
            </div>
            <div className="mb-6">
              <div className="flex justify-between mb-3">
                <span className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>Age Range</span>
                <span className="text-[13px]" style={{ color: "#8a7460" }}>{ageMin} – {ageMax}</span>
              </div>
              <div className="flex flex-col gap-2">
                <input type="range" min={18} max={60} value={ageMin} onChange={(e) => setAgeMin(Math.min(+e.target.value, ageMax - 1))} className="w-full accent-[#f0e8dc]" />
                <input type="range" min={18} max={60} value={ageMax} onChange={(e) => setAgeMax(Math.max(+e.target.value, ageMin + 1))} className="w-full accent-[#f0e8dc]" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[11px]" style={{ color: "#8a7460" }}>Min: {ageMin}</span>
                <span className="text-[11px]" style={{ color: "#8a7460" }}>Max: {ageMax}</span>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-[14px] font-semibold block mb-3" style={{ color: "#f5f0ea" }}>Distance</span>
              <div className="flex gap-2">
                {(["all", "nearby"] as const).map((d) => (
                  <button key={d} onClick={() => setDistFilter(d)} className="flex-1 py-2 rounded-[12px] text-[13px] font-medium"
                    style={{ background: distFilter === d ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#2a231a", color: distFilter === d ? "#1a1410" : "#8a7460", border: distFilter === d ? "none" : "0.5px solid #3a2e1e" }}>
                    {d === "all" ? "Everyone" : "Nearby"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-7">
              <span className="text-[14px] font-semibold block mb-3" style={{ color: "#f5f0ea" }}>Gender</span>
              <div className="flex gap-2">
                {(["all", "male", "female"] as const).map((g) => (
                  <button key={g} onClick={() => setGenderFilter(g)} className="flex-1 py-2 rounded-[12px] text-[13px] font-medium"
                    style={{ background: genderFilter === g ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#2a231a", color: genderFilter === g ? "#1a1410" : "#8a7460", border: genderFilter === g ? "none" : "0.5px solid #3a2e1e" }}>
                    {g === "all" ? "All" : g === "male" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowFilters(false)} className="w-full py-3 rounded-[16px] text-[15px] font-bold" style={{ background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410" }}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
  );
}

const PersonCard = memo(function PersonCard({ p, primaryAction, onAction }: { p: Profile; primaryAction: boolean; onAction: () => void }) {
  const displayName = p.name || p.username;
  const location = [p.city, p.state].filter(Boolean).join(", ") || p.state || "";
  return (
    <div className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow">
      <UserAvatar id={p.id} name={displayName} online={p.is_online} size={46} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>
          {displayName}
          {p.age ? <span className="ml-1.5 text-[13px] font-normal" style={{ color: "#8a7460" }}>· {p.age}</span> : null}
        </p>
        {location && <p className="text-[12px] mt-0.5" style={{ color: "#6e5e48" }}>{location}</p>}
      </div>
      <button
        onClick={onAction}
        className="rounded-[13px] text-[12px]"
        style={{
          padding: "8px 15px",
          ...(primaryAction
            ? { background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410", fontWeight: 700 }
            : { background: "#2a2318", color: "#f0ebe4", fontWeight: 600, border: "0.5px solid #3e3222" }),
        }}
      >
        + Add
      </button>
    </div>
  );
});
