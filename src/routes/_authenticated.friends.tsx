import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Friends,
});

type Friend = {
  id: string;
  username: string;
  name: string | null;
  city: string | null;
  state: string | null;
  is_online: boolean;
};

function Friends() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: rels } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .limit(80);

      if (!active) return;
      const ids = (rels ?? []).map((r) =>
        r.requester_id === user.id ? r.addressee_id : r.requester_id
      );
      setFriendIds(ids);
      if (ids.length === 0) { setFriends([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,name,city,state,is_online")
        .in("id", ids)
        .order("is_online", { ascending: false });
      if (!active) return;
      setFriends((profs ?? []) as Friend[]);
    })();
    return () => { active = false; };
  }, [user]);

  // ✅ FIX: Realtime subscription to update friend online status live
  useEffect(() => {
    if (!user || friendIds.length === 0) return;

    const channel = supabase
      .channel("friends:presence")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Friend;
          // Only care about friends
          if (!friendIds.includes(updated.id)) return;
          setFriends((prev) => {
            if (!prev) return prev;
            return prev.map((f) =>
              f.id === updated.id ? { ...f, is_online: updated.is_online } : f
            );
          });
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, friendIds]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  // Sort: online friends first
  const list = useMemo(
    () => (friends ?? []).slice().sort((a, b) => Number(b.is_online) - Number(a.is_online)),
    [friends]
  );

  const onlineCount = useMemo(() => list.filter((f) => f.is_online).length, [list]);

  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-bold warm-grad-text leading-none">Friends</h1>
          {friends !== null && list.length > 0 && (
            <span className="text-[12px]" style={{ color: onlineCount > 0 ? "#6dbf6a" : "#6e5e48" }}>
              {onlineCount > 0 ? `${onlineCount} online` : "None online"}
            </span>
          )}
        </div>

        {friends === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[78px] rounded-[20px] warm-card neo-shimmer" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#6e5e48" }}>
            <p className="text-sm">No friends yet.</p>
            <p className="text-[12px] mt-1">Add people from Discover to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((f) => (
              <FriendCard key={f.id} f={f} onMessage={() => openDM(f.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const FriendCard = memo(function FriendCard({ f, onMessage }: { f: Friend; onMessage: () => void }) {
  const displayName = f.name || f.username;
  const location = [f.city, f.state].filter(Boolean).join(", ") || f.state || "";
  return (
    <div className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow">
      <UserAvatar id={f.id} name={displayName} online={f.is_online} size={46} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>{displayName}</p>
        {location && <p className="text-[12px] mt-0.5" style={{ color: "#6e5e48" }}>{location}</p>}
        <p className="text-[11px] mt-0.5" style={{ color: f.is_online ? "#6dbf6a" : "#5e5040" }}>
          {f.is_online ? "● Online" : "○ Offline"}
        </p>
      </div>
      <button
        onClick={onMessage}
        className="rounded-[13px] text-[12px] font-semibold"
        style={{ padding: "8px 15px", background: "#2a2318", color: "#f0ebe4", border: "0.5px solid #3e3222" }}
      >
        Message
      </button>
    </div>
  );
});
