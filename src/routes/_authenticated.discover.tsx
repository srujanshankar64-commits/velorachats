import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const [friendships, setFriendships] = useState<any[]>([]);

  const loadFriendships = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (data) setFriendships(data);
  }, [user]);

  useEffect(() => {
    loadFriendships();
  }, [user, profiles, loadFriendships]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  async function handleAddFriend(targetId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Friend request sent!");
      loadFriendships();
    }
  }

  async function handleAcceptFriend(friendshipId: string) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Friend request accepted!");
      loadFriendships();
    }
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
            {list.map((p) => {
              const friendship = friendships.find(
                (f) =>
                  (f.requester_id === user?.id && f.addressee_id === p.id) ||
                  (f.requester_id === p.id && f.addressee_id === user?.id)
              );
              return (
                <PersonCard
                  key={p.id}
                  p={p}
                  friendship={friendship}
                  onAdd={() => handleAddFriend(p.id)}
                  onAccept={() => handleAcceptFriend(friendship?.id)}
                  onMessage={() => openDM(p.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Filter bottom sheet */}
      <FilterSheet
        open={showFilters}
        genderFilter={genderFilter}
        ageMin={ageMin}
        ageMax={ageMax}
        onGenderChange={setGenderFilter}
        onAgeMinChange={setAgeMin}
        onAgeMaxChange={setAgeMax}
        onReset={() => { setGenderFilter("all"); setAgeMin(18); setAgeMax(60); }}
        onApply={() => setShowFilters(false)}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}

function FilterSheet({ open, genderFilter, ageMin, ageMax, onGenderChange, onAgeMinChange, onAgeMaxChange, onReset, onApply, onClose }: {
  open: boolean; genderFilter: "all"|"male"|"female"; ageMin: number; ageMax: number;
  onGenderChange: (v: "all"|"male"|"female") => void; onAgeMinChange: (v: number) => void;
  onAgeMaxChange: (v: number) => void; onReset: () => void; onApply: () => void; onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)));
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  function close(cb: () => void) {
    setAnimIn(false);
    setTimeout(() => { setVisible(false); cb(); }, 340);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] transition-opacity duration-300 flex items-end"
      style={{
        background: animIn ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        backdropFilter: animIn ? "blur(6px)" : "blur(0px)",
        WebkitBackdropFilter: animIn ? "blur(6px)" : "blur(0px)",
        transition: "all 0.35s ease",
      }}
      onClick={() => close(onClose)}>
      <div className="w-full rounded-t-[32px] p-5 pb-8 flex flex-col justify-between"
        style={{
          background: "rgba(28, 22, 16, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid #3a2e1e",
          height: "35dvh",
          minHeight: "330px",
          transform: animIn ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-1.5 rounded-full" style={{ background: "#3a2e1e" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[17px] font-bold" style={{ color: "#f5f0ea" }}>Filter People</span>
          <button onClick={onReset} className="text-[12px] font-semibold px-3 py-1 rounded-[10px]"
            style={{ color: "#8a7460", background: "#2a2318", border: "0.5px solid #3e3222" }}>
            Reset
          </button>
        </div>

        {/* Content box */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* Gender — segmented control pill */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: "#5e5040" }}>Show me</p>
            <div className="flex p-1 rounded-full bg-[#231d13] border border-[#33291a]">
              {([
                { val: "all" as const, label: "Everyone" },
                { val: "male" as const, label: "Males" },
                { val: "female" as const, label: "Females" },
              ]).map(({ val, label }) => {
                const active = genderFilter === val;
                return (
                  <button key={val} onClick={() => onGenderChange(val)}
                    className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all"
                    style={{
                      background: active ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "transparent",
                      color: active ? "#1a1410" : "#8a7460",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age range */}
          <div>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#5e5040" }}>Age Range</span>
              <span className="text-[13px] font-bold" style={{ color: "#f0e8dc" }}>{ageMin} – {ageMax} yrs</span>
            </div>
            <div className="rounded-[20px] p-3 flex flex-col gap-2.5" style={{ background: "#231d13", border: "0.5px solid #33291a" }}>
              <input type="range" min={18} max={60} value={ageMin}
                onChange={(e) => onAgeMinChange(Math.min(+e.target.value, ageMax - 1))}
                className="w-full accent-[#f0e8dc] h-1 bg-[#1a1410] rounded-lg cursor-pointer" />
              <input type="range" min={18} max={60} value={ageMax}
                onChange={(e) => onAgeMaxChange(Math.max(+e.target.value, ageMin + 1))}
                className="w-full accent-[#f0e8dc] h-1 bg-[#1a1410] rounded-lg cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Apply */}
        <div className="mt-3">
          <button onClick={() => close(onApply)} className="w-full py-3 rounded-full text-[14px] font-bold"
            style={{ background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410" }}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

const PersonCard = memo(function PersonCard({
  p,
  friendship,
  onAdd,
  onAccept,
  onMessage,
}: {
  p: Profile;
  friendship?: { id: string; requester_id: string; addressee_id: string; status: string };
  onAdd: () => void;
  onAccept: () => void;
  onMessage: () => void;
}) {
  const displayName = p.name || p.username;
  const location = [p.city, p.state].filter(Boolean).join(", ") || p.state || "";

  let buttonLabel = "+ Add";
  let buttonStyle = { padding: "8px 15px", background: "#2a2318", color: "#f0ebe4", fontWeight: 600, border: "0.5px solid #3e3222" };
  let clickHandler = onAdd;

  if (friendship) {
    if (friendship.status === "accepted") {
      buttonLabel = "Message";
      buttonStyle = { padding: "8px 15px", background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410", fontWeight: 600, border: "none" } as any;
      clickHandler = onMessage;
    } else if (friendship.status === "pending") {
      if (friendship.requester_id === p.id) {
        buttonLabel = "Accept";
        buttonStyle = { padding: "8px 15px", background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410", fontWeight: 600, border: "none" } as any;
        clickHandler = onAccept;
      } else {
        buttonLabel = "Requested";
        buttonStyle = { padding: "8px 15px", background: "#1c1610", color: "#5e5040", fontWeight: 500, border: "0.5px solid #231d13" } as any;
        clickHandler = () => {}; // Disabled
      }
    }
  }

  const handleCardClick = () => {
    onMessage();
  };

  return (
    <div
      className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow cursor-pointer active:opacity-80"
      onClick={handleCardClick}
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
        onClick={(e) => { e.stopPropagation(); clickHandler(); }}
        className="rounded-[13px] text-[12px]"
        style={buttonStyle}
        disabled={friendship?.status === "pending" && friendship.requester_id !== p.id}
      >
        {buttonLabel}
      </button>
    </div>
  );
});
