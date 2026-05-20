import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Velora" }] }),
  component: Messages,
});

type RoomRow = {
  id: string; user_a: string; user_b: string; created_at: string;
  other?: { id: string; username: string; avatar_url: string | null; is_online: boolean };
  last?: { content: string; created_at: string } | null;
};

function Messages() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("id,user_a,user_b,created_at")
        .eq("type", "dm")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      const rows = (roomsData ?? []) as RoomRow[];
      const otherIds = Array.from(new Set(rows.map((r) => r.user_a === user.id ? r.user_b : r.user_a)));
      const [{ data: profs }, ...lastMsgs] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url,is_online").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]),
        ...rows.map((r) => supabase.from("messages").select("content,created_at").eq("room_id", r.id).order("created_at", { ascending: false }).limit(1).maybeSingle()),
      ]);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p as RoomRow["other"]]));
      rows.forEach((r, i) => {
        const oid = r.user_a === user.id ? r.user_b : r.user_a;
        r.other = profMap.get(oid);
        r.last = (lastMsgs[i]?.data as RoomRow["last"]) ?? null;
      });
      if (active) { setRooms(rows); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-4">Messages</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass rounded-2xl h-16 animate-pulse" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No conversations yet</p>
          <Link to="/discover" className="inline-block px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold">Discover people</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => r.other && (
            <Link key={r.id} to="/messages/$userId" params={{ userId: r.other.id }} className="flex items-center gap-3 glass rounded-2xl p-3 hover:bg-white/5 transition">
              <div className="relative">
                {r.other.avatar_url ? (
                  <img src={r.other.avatar_url} alt="" loading="lazy" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center font-bold">{r.other.username[0]?.toUpperCase()}</div>
                )}
                {r.other.is_online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-background" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{r.other.username}</p>
                <p className="text-xs text-muted-foreground truncate">{r.last?.content ?? "Say hi 👋"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
