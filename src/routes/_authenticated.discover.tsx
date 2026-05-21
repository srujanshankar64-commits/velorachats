import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Clock, Check, MessageCircle, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — Velora" }] }),
  component: Discover,
});

type Profile = {
  id: string; username: string; avatar_url: string | null;
  gender: string; age: number | null; country: string | null;
  bio: string | null; is_online: boolean;
};

type Friendship = {
  id: string; requester_id: string; addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  is_temporary: boolean; expires_at: string | null;
};

function Discover() {
  const { user } = useAuth();
  const { unread, markRead } = useUnread();
  const nav = useNavigate();
  const [tab, setTab] = useState<"friends" | "everyone">("everyone");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "male" | "female">("online");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  // Load friendships
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from("friendships").select("*").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .then(({ data }) => { if (active) setFriends((data ?? []) as Friendship[]); });
    const ch = supabase.channel(`friends:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        supabase.from("friendships").select("*").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .then(({ data }) => { if (active) setFriends((data ?? []) as Friendship[]); });
      })
      .subscribe();
    return () => { active = false; ch.unsubscribe(); };
  }, [user]);

  // Load profiles
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    let query = supabase.from("profiles").select("id,username,avatar_url,gender,age,country,bio,is_online").neq("id", user.id).limit(80);
    if (filter === "online") query = query.eq("is_online", true);
    if (filter === "male" || filter === "female") query = query.eq("gender", filter);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    query.order("is_online", { ascending: false }).order("last_seen", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, filter, q]);

  // Map: otherId -> friendship (so we can show status)
  const friendByUser = useMemo(() => {
    const m = new Map<string, Friendship>();
    friends.forEach((f) => {
      const other = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
      m.set(other, f);
    });
    return m;
  }, [friends, user?.id]);

  const acceptedFriendIds = useMemo(() => new Set(
    friends.filter((f) => f.status === "accepted")
      .map((f) => f.requester_id === user?.id ? f.addressee_id : f.requester_id)
  ), [friends, user?.id]);

  const friendProfiles = useMemo(
    () => profiles.filter((p) => acceptedFriendIds.has(p.id)),
    [profiles, acceptedFriendIds],
  );
  const shownProfiles = tab === "friends" ? friendProfiles : profiles;

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    await markRead(targetId);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  async function addFriend(targetId: string, temporary: boolean) {
    if (!user) return;
    const existing = friendByUser.get(targetId);
    if (existing) {
      toast(existing.status === "accepted" ? "Already friends" : "Request already sent");
      return;
    }
    const expires_at = temporary ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id, addressee_id: targetId, is_temporary: temporary, expires_at,
      // Auto-accept so both can text instantly (Telegram-style soft friending)
      status: "accepted",
    });
    if (error) return toast.error(error.message);
    toast.success(temporary ? "Timepass friend for 24h ⏳" : "Friend added ✨");
  }

  return (
    <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-display font-bold">Discover</h1>
        <div className="text-[11px] text-muted-foreground">{acceptedFriendIds.size} friends</div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 glass rounded-2xl px-3 mb-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username" className="flex-1 bg-transparent outline-none py-2.5 text-sm" />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl glass mb-3">
        <button onClick={() => setTab("everyone")} className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === "everyone" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Globe className="h-3.5 w-3.5" /> Everyone
        </button>
        <button onClick={() => setTab("friends")} className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === "friends" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Users className="h-3.5 w-3.5" /> Friends
        </button>
      </div>

      {/* Filter chips */}
      {tab === "everyone" && (
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-thin -mx-1 px-1">
          {(["online", "all", "female", "male"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${filter === f ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{f}</button>
          ))}
        </div>
      )}

      {/* WhatsApp-style compact list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass rounded-2xl h-14 animate-pulse" />)}</div>
      ) : shownProfiles.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{tab === "friends" ? "No friends yet — add some from Everyone." : "No profiles found."}</p>
      ) : (
        <div className="divide-y divide-border/40 glass-strong rounded-2xl overflow-hidden">
          {shownProfiles.map((p) => {
            const f = friendByUser.get(p.id);
            const isFriend = f?.status === "accepted";
            const unreadN = unread[p.id] ?? 0;
            return (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition">
                <button onClick={() => openDM(p.id)} className="relative shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" loading="lazy" className="h-11 w-11 rounded-full" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-sm">{p.username[0]?.toUpperCase()}</div>
                  )}
                  {p.is_online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />}
                  {unreadN > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                      {unreadN > 9 ? "9+" : unreadN}
                    </span>
                  )}
                </button>
                <button onClick={() => openDM(p.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-semibold text-sm truncate ${unreadN > 0 ? "text-foreground" : ""}`}>{p.username}</p>
                    {f?.is_temporary && <Clock className="h-3 w-3 text-accent shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {unreadN > 0 ? <span className="text-primary font-medium">New message</span> : (p.bio || `${p.gender}${p.age ? ` · ${p.age}` : ""}${p.country ? ` · ${p.country}` : ""}`)}
                  </p>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isFriend ? (
                    <span className="h-8 w-8 rounded-full glass flex items-center justify-center text-green-400" title="Friends"><Check className="h-3.5 w-3.5" /></span>
                  ) : (
                    <>
                      <button onClick={() => addFriend(p.id, false)} className="h-8 w-8 rounded-full glass flex items-center justify-center hover:bg-white/10" title="Add friend">
                        <UserPlus className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => addFriend(p.id, true)} className="h-8 w-8 rounded-full glass flex items-center justify-center hover:bg-white/10" title="Timepass friend (24h)">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={() => openDM(p.id)} className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center" title="Message">
                    <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
