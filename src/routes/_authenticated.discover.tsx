import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState, useCallback } from "react";
import { Search, UserPlus, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — ShhChats" }] }),
  component: Discover,
});

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  last_seen_at?: string | null;
  age?: number | null;
  name?: string | null;
  state?: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"online" | "all">("online");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<Record<string, Friendship>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Helper to determine if a profile is online (Instagram/WhatsApp style check)
  const getIsOnline = (p: Profile) => {
    if (!p.is_online || !p.last_seen_at) return false;
    const diff = Date.now() - new Date(p.last_seen_at).getTime();
    return diff < 60000; // Online if last heartbeat is within 60 seconds
  };

  // Re-evaluate online status every 10 seconds (ticks)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch friendships
  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    
    if (error) {
      console.error("Error fetching friendships:", error.message);
      return;
    }

    const map: Record<string, Friendship> = {};
    data?.forEach((f) => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      map[otherId] = f as Friendship;
    });
    setFriendships(map);
  }, [user]);

  // Fetch profiles on filter/search change
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select("id,username,avatar_url,bio,is_online,last_seen_at,age,name,state")
      .neq("id", user.id)
      .limit(100);

    if (q.trim()) {
      query = query.ilike("username", `%${q.trim()}%`);
    }

    Promise.all([
      query,
      fetchFriendships(),
    ]).then(([profileRes]) => {
      if (!active) return;
      if (profileRes.error) toast.error(profileRes.error.message);
      const GHOST_USERS: Profile[] = [
  { id: "ghost-1", username: "nightowl_anon", avatar_url: null, bio: "here for late night convos", is_online: true, last_seen_at: new Date().toISOString(), age: 22, name: "Night Owl", state: "India" },
  { id: "ghost-2", username: "insomniac_", avatar_url: null, bio: "cant sleep, lets talk", is_online: true, last_seen_at: new Date().toISOString(), age: 19, name: "Insomniac", state: "India" },
  { id: "ghost-3", username: "anon_vibes", avatar_url: null, bio: "just vibing anonymously", is_online: true, last_seen_at: new Date().toISOString(), age: $null, name: $null, state: $null },
];
const realProfiles = (profileRes.data ?? []) as Profile[];
const ghostsToShow = realProfiles.length === 0 ? GHOST_USERS : [];
setProfiles([...ghostsToShow, ...realProfiles]);
      setLoading(false);
    });

    return () => { active = false; };
  }, [user, q, fetchFriendships]);

  // Real-time listener for database updates on profiles
  useEffect(() => {
    const ch = supabase.channel("profiles-db-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        setProfiles((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );
      })
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, []);

  // Friend actions
  const handleAddFriend = useCallback(async (targetId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Friend request sent!");
      fetchFriendships();
    }
  }, [user, fetchFriendships]);

  const handleAcceptFriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Friend request accepted!");
      fetchFriendships();
    }
  }, [fetchFriendships]);

  const handleCancelFriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Request removed.");
      fetchFriendships();
    }
  }, [fetchFriendships]);

  // Compute live list (sort, dynamic online filter, age name state checks)
  const list = useMemo(() => {
    let result = profiles.map((p) => ({
      ...p,
      _liveOnline: getIsOnline(p),
    }));

    if (filter === "online") {
      result = result.filter((p) => p._liveOnline);
    }

    // Sort: Online first, then by username
    result.sort((a, b) => {
      if (a._liveOnline && !b._liveOnline) return -1;
      if (!a._liveOnline && b._liveOnline) return 1;
      return a.username.localeCompare(b.username);
    });

    return result;
  }, [profiles, filter, tick]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <h1 className="text-[20px] mb-4">Discover</h1>
        <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#1C1C1E] mb-3">
          <Search className="h-4 w-4 text-[#666]" strokeWidth={1.5} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666]" />
        </div>
        <div className="flex gap-2 mb-3">
          {(["online", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 h-8 rounded-full text-xs transition-opacity duration-200 ${filter === f ? "bg-[#7C3AED] text-white" : "bg-[#1C1C1E] text-[#888]"}`}>
              {f === "online" ? "Online" : "Everyone"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-[#0d0d0e]" />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12"><p className="text-2xl mb-2">🌙</p><p className="text-sm text-[#888]">No one online right now</p><p className="text-xs text-[#555] mt-1">Most people show up late at night · Check back after 10 PM</p></div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((p) => (
              <Card
                key={p.id}
                p={p}
                isOnline={p._liveOnline}
                onClick={() => openDM(p.id)}
                friendship={friendships[p.id]}
                onAddFriend={() => handleAddFriend(p.id)}
                onAcceptFriend={() => handleAcceptFriend(friendships[p.id]?.id)}
                onCancelFriend={() => handleCancelFriend(friendships[p.id]?.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Card = memo(function Card({
  p,
  isOnline,
  onClick,
  friendship,
  onAddFriend,
  onAcceptFriend,
  onCancelFriend,
}: {
  p: Profile;
  isOnline: boolean;
  onClick: () => void;
  friendship?: Friendship;
  onAddFriend: () => void;
  onAcceptFriend: () => void;
  onCancelFriend: () => void;
}) {
  const renderFriendshipBtn = () => {
    if (!friendship) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddFriend();
          }}
          className="px-3 h-8 text-xs rounded-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-white shrink-0 flex items-center gap-1 font-medium transition-all"
        >
          <UserPlus className="h-3 w-3" /> Add
        </button>
      );
    }
    
    if (friendship.status === "pending") {
      if (friendship.requester_id === p.id) {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcceptFriend();
            }}
            className="px-3 h-8 text-xs rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 font-medium transition-all"
          >
            Accept
          </button>
        );
      } else {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelFriend();
            }}
            className="px-3 h-8 text-xs rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-[#888] shrink-0 font-medium transition-all"
          >
            Requested
          </button>
        );
      }
    }
    
    if (friendship.status === "accepted") {
      return (
        <span className="px-3 h-8 text-xs rounded-full bg-white/5 border border-white/10 text-[#888] flex items-center gap-1 shrink-0 font-medium">
          <UserCheck className="h-3 w-3 text-emerald-400" /> Friends
        </span>
      );
    }
    
    return null;
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between h-[72px] px-2 rounded-2xl hover:bg-[#1C1C1E] transition-opacity duration-200 text-left cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-[#7C3AED] flex items-center justify-center text-sm font-semibold">{p.username[0]?.toUpperCase()}</div>
          )}
          {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-black" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 leading-tight">
            <p className="text-sm text-white truncate font-medium">{p.name || p.username}</p>
            {p.age && <span className="text-[11px] text-[#888]">{p.age} y/o</span>}
          </div>
          <p className="text-[12px] text-[#888] truncate mt-0.5">
            {p.state ? `${p.state}` : "India"} {p.bio ? `· ${p.bio}` : ""}
          </p>
        </div>
      </div>
      
      <div className="ml-2 shrink-0">
        {renderFriendshipBtn()}
      </div>
    </div>
  );
});
