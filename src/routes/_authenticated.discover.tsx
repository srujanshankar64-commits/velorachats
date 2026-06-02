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
  last_seen: string | null;
};

type Tab = "online" | "all" | "nearby";

function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Tab>("online");
  // allUsers holds the full unfiltered list from DB — filtering is done client-side
  const [allUsers, setAllUsers] = useState<Profile[] | null>(null);
  const [meState, setMeState] = useState<string | null>(null);

  // Fetch current user's state once
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("state")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setMeState((data as { state?: string | null } | null)?.state ?? null);
      });
  }, [user]);

  // Fetch ALL other users once (no server-side filter by tab)
  useEffect(() => {
    if (!user) return;
    let active = true;
    setAllUsers(null);
    supabase
      .from("profiles")
      .select("id,username,name,age,city,state,is_online,last_seen")
      .neq("id", user.id)
      .order("is_online", { ascending: false })
      .order("last_seen", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(error.message);
        setAllUsers((data ?? []) as Profile[]);
      });
    return () => { active = false; };
  }, [user]);

  // Realtime subscription — update individual users in allUsers when their presence changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("discover-presence-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Profile;
          setAllUsers((prev) => {
            if (!prev) return prev;
            // If this user isn't in our list yet, ignore
            const exists = prev.some((u) => u.id === updated.id);
            if (!exists) return prev;
            return prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u);
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Client-side filtering by tab + search query
  const list = useMemo(() => {
    if (!allUsers) return null;
    let result = allUsers;

    // Apply tab filter
    if (filter === "online") {
      result = result.filter((u) => u.is_online === true);
    } else if (filter === "nearby") {
      if (!meState) return [];
      const myState = meState.toLowerCase().trim();
      result = result.filter((u) => u.state?.toLowerCase().trim() === myState);
      // For nearby: online first, then offline, both by last_seen desc
      result = [...result].sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return new Date(b.last_seen ?? 0).getTime() - new Date(a.last_seen ?? 0).getTime();
      });
    } else {
      // Everyone: online first then offline, both by last_seen desc
      result = [...result].sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return new Date(b.last_seen ?? 0).getTime() - new Date(a.last_seen ?? 0).getTime();
      });
    }

    // Apply search query
    if (q.trim()) {
      const lq = q.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(lq) ||
          u.name?.toLowerCase().includes(lq)
      );
    }

    return result;
  }, [allUsers, filter, q, meState]);

  const onlineCount = useMemo(() => (allUsers ?? []).filter((p) => p.is_online).length, [allUsers]);

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
          {filter === "online" ? "Active now" : filter === "nearby" ? "Near you" : "Everyone"} · {allUsers ? `${filter === "online" ? onlineCount : (list?.length ?? 0)} people` : "loading…"}
        </p>

        {allUsers === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[78px] rounded-[20px] warm-card neo-shimmer" />
            ))}
          </div>
        ) : filter === "nearby" && !meState ? (
          <p className="text-center text-sm py-12" style={{ color: "#6e5e48" }}>
            Set your state in your profile to see nearby people.
          </p>
        ) : !list || list.length === 0 ? (
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
