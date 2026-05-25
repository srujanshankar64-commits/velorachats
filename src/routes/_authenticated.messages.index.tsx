import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — ShhChats" }] }),
  component: Messages,
});

type RoomRow = {
  id: string; user_a: string; user_b: string; created_at: string;
  other?: { id: string; username: string; avatar_url: string | null; is_online: boolean };
  last?: { content: string; created_at: string; sender_id: string } | null;
  otherLastRead?: string | null;
};

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const days = Math.floor((+now - +d) / 86400000);
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Messages() {
  const { user } = useAuth();
  const { unread } = useUnread();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ch = supabase.channel("global-presence");
    const updateOnlineList = () => {
      const state = ch.presenceState();
      const onlineMap: Record<string, boolean> = {};
      Object.keys(state).forEach((key) => {
        onlineMap[key] = true;
      });
      setOnlineUsers(onlineMap);
    };
    ch.on("presence", { event: "sync" }, updateOnlineList)
      .on("presence", { event: "join" }, updateOnlineList)
      .on("presence", { event: "leave" }, updateOnlineList)
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, []);

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
      if (rows.length === 0) { if (active) { setRooms([]); setLoading(false); } return; }

      const otherIds = Array.from(new Set(rows.map((r) => r.user_a === user.id ? r.user_b : r.user_a)));
      const [{ data: profs }, { data: reads }, ...lastMsgs] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url,is_online").in("id", otherIds),
        supabase.from("room_reads").select("room_id,last_read_at,user_id").in("room_id", rows.map((r) => r.id)),
        ...rows.map((r) => supabase.from("messages").select("content,created_at,sender_id").eq("room_id", r.id).order("created_at", { ascending: false }).limit(1).maybeSingle()),
      ]);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p as RoomRow["other"]]));
      rows.forEach((r, i) => {
        const oid = r.user_a === user.id ? r.user_b : r.user_a;
        r.other = profMap.get(oid);
        r.last = (lastMsgs[i]?.data as RoomRow["last"]) ?? null;
        const otherRead = (reads ?? []).find((x) => x.room_id === r.id && x.user_id === oid);
        r.otherLastRead = otherRead?.last_read_at ?? null;
      });
      // Sort by most recent message
      rows.sort((a, b) => (b.last?.created_at ?? b.created_at).localeCompare(a.last?.created_at ?? a.created_at));
      if (active) { setRooms(rows); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter((r) => r.other?.username.toLowerCase().includes(term));
  }, [rooms, q]);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <h1 className="text-[20px] mb-4">Messages</h1>
        <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#1C1C1E] mb-3">
          <Search className="h-4 w-4 text-[#666]" strokeWidth={1.5} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666]" />
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-[#0d0d0e]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="h-8 w-8 mx-auto text-[#444] mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#888] mb-5">{rooms.length === 0 ? "No conversations yet" : "No matches"}</p>
            {rooms.length === 0 && (
              <Link to="/random" className="inline-block px-6 h-12 leading-[3rem] rounded-full bg-[#7C3AED] text-sm">Start a random chat</Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((r) => r.other && (
              <Row key={r.id}
                otherId={r.other.id}
                username={r.other.username}
                avatar={r.other.avatar_url}
                online={!!onlineUsers[r.other.id]}
                last={r.last}
                myId={user!.id}
                otherLastRead={r.otherLastRead ?? null}
                unread={unread[r.other.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Row = memo(function Row({ otherId, username, avatar, online, last, myId, otherLastRead, unread }: {
  otherId: string;
  username: string;
  avatar: string | null;
  online: boolean;
  last: RoomRow["last"];
  myId: string;
  otherLastRead: string | null;
  unread: number;
}) {
  const myLast = last && last.sender_id === myId;
  const seen = myLast && otherLastRead && otherLastRead >= last!.created_at;
  return (
    <Link to="/messages/$userId" params={{ userId: otherId }} className="flex items-center gap-3 h-[72px] px-2 rounded-2xl hover:bg-[#1C1C1E] transition-opacity duration-200">
      <div className="relative shrink-0">
        {avatar ? (
          <img src={avatar} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-[#7C3AED] flex items-center justify-center text-sm text-white">{username[0]?.toUpperCase()}</div>
        )}
        {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{username}</p>
        <p className="text-[13px] text-[#888] truncate">{last?.content ?? "Say hi 👋"}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-[#666]">{fmtTime(last?.created_at)}</span>
        {unread > 0 ? (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#7C3AED] text-[10px] text-white flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>
        ) : seen ? (
          <Eye className="h-3.5 w-3.5 text-[#7C3AED]" strokeWidth={1.5} />
        ) : null}
      </div>
    </Link>
  );
});
