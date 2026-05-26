import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, UserCheck, UserPlus, MessageCircle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Friends — ShhChats" }] }),
  component: FriendsPage,
});

type FriendRow = {
  id: string; // friendship ID
  status: string;
  isRequester: boolean;
  friend: {
    id: string;
    username: string;
    avatar_url: string | null;
    age: number | null;
    state: string | null;
    is_online: boolean;
    last_seen_at: string | null;
  };
};

function FriendsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendsData = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      setRequests([]);
      setLoading(false);
      return;
    }

    // Extract other user ids
    const otherIds = friendships.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,age,state,is_online,last_seen_at")
      .in("id", otherIds);

    if (profError) {
      toast.error(profError.message);
      setLoading(false);
      return;
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    
    const resolvedFriends: FriendRow[] = [];
    const resolvedRequests: FriendRow[] = [];

    friendships.forEach((f) => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const profile = profileMap.get(otherId);
      if (!profile) return;

      const row: FriendRow = {
        id: f.id,
        status: f.status,
        isRequester: f.requester_id === user.id,
        friend: profile as any,
      };

      if (f.status === "accepted") {
        resolvedFriends.push(row);
      } else if (f.status === "pending") {
        resolvedRequests.push(row);
      }
    });

    setFriends(resolvedFriends);
    setRequests(resolvedRequests);
    setLoading(false);
  };

  useEffect(() => {
    fetchFriendsData();
  }, [user]);

  const acceptRequest = async (id: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Friend request accepted!");
    fetchFriendsData();
  };

  const rejectRequest = async (id: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Request removed.");
    fetchFriendsData();
  };

  const openChat = async (targetId: string) => {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  };

  const getIsOnline = (friend: FriendRow["friend"]) => {
    if (!friend.is_online || !friend.last_seen_at) return false;
    return Date.now() - new Date(friend.last_seen_at).getTime() < 60000;
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
        <h1 className="text-[20px] mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#8AB4F8]" /> Friends
        </h1>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-[#0d0d0e] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Friend Requests Section */}
            {requests.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs text-[#888] font-semibold uppercase tracking-wider px-2">
                  Friend Requests ({requests.length})
                </h2>
                <div className="flex flex-col gap-1 bg-[#1A1A1F] rounded-2xl p-2 border border-white/5">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#7C3AED] flex items-center justify-center font-semibold">
                          {r.friend.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.friend.username}</p>
                          <p className="text-xs text-[#888]">
                            {r.friend.age ? `${r.friend.age} y/o` : ""} {r.friend.state ? `· ${r.friend.state}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.isRequester ? (
                          <button onClick={() => rejectRequest(r.id)} className="px-3 h-8 text-xs rounded-full bg-white/10 hover:bg-white/20">
                            Cancel
                          </button>
                        ) : (
                          <>
                            <button onClick={() => acceptRequest(r.id)} className="px-3 h-8 text-xs rounded-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-white">
                              Accept
                            </button>
                            <button onClick={() => rejectRequest(r.id)} className="px-3 h-8 text-xs rounded-full bg-white/10 hover:bg-white/20">
                              Ignore
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List Section */}
            <div className="space-y-2">
              <h2 className="text-xs text-[#888] font-semibold uppercase tracking-wider px-2">
                All Friends ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <div className="text-center py-12 bg-[#1A1A1F] rounded-2xl border border-white/5">
                  <UserPlus className="h-8 w-8 mx-auto text-[#444] mb-2" />
                  <p className="text-sm text-[#888]">No friends added yet</p>
                  <button onClick={() => nav({ to: "/discover" })} className="mt-4 px-4 h-9 rounded-full bg-[#7C3AED] text-xs text-white">
                    Find Friends
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1 bg-[#1A1A1F] rounded-2xl p-2 border border-white/5">
                  {friends.map((f) => {
                    const online = getIsOnline(f.friend);
                    return (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-[#7C3AED] flex items-center justify-center font-semibold">
                              {f.friend.username[0]?.toUpperCase()}
                            </div>
                            {online && (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#1A1A1F]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{f.friend.username}</p>
                            <p className="text-xs text-[#888]">
                              {f.friend.age ? `${f.friend.age} y/o` : ""} {f.friend.state ? `· ${f.friend.state}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openChat(f.friend.id)} className="h-8 w-8 rounded-full bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 flex items-center justify-center text-[#8AB4F8]" title="Message">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => rejectRequest(f.id)} className="px-3 h-8 text-xs rounded-full bg-red-900/20 hover:bg-red-950/40 text-red-400">
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
