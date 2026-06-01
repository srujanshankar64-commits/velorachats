import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { UserAvatar } from "@/components/user-avatar";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Messages,
});

type RoomRow = {
  id: string; user_a: string; user_b: string; created_at: string;
  other?: { id: string; username: string; name: string | null; is_online: boolean; age?: number | null };
  last?: { content: string; created_at: string; sender_id: string } | null;
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
  const [rooms, setRooms] = useState<RoomRow[] | null>(null);
  const [q, setQ] = useState("");

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
      if (rows.length === 0) { if (active) setRooms([]); return; }

      const otherIds = Array.from(new Set(rows.map((r) => r.user_a === user.id ? r.user_b : r.user_a)));
      const [{ data: profs }, ...lastMsgs] = await Promise.all([
        supabase.from("profiles").select("id,username,name,is_online,age").in("id", otherIds),
        ...rows.map((r) => supabase.from("messages").select("content,created_at,sender_id").eq("room_id", r.id).order("created_at", { ascending: false }).limit(1).maybeSingle()),
      ]);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p as RoomRow["other"]]));
      rows.forEach((r, i) => {
        const oid = r.user_a === user.id ? r.user_b : r.user_a;
        r.other = profMap.get(oid);
        r.last = (lastMsgs[i]?.data as RoomRow["last"]) ?? null;
      });
      rows.sort((a, b) => (b.last?.created_at ?? b.created_at).localeCompare(a.last?.created_at ?? a.created_at));
      if (active) setRooms(rows);
    })();
    return () => { active = false; };
  }, [user]);

  const filtered = useMemo(() => {
    const list = rooms ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((r) => (r.other?.name || r.other?.username || "").toLowerCase().includes(term));
  }, [rooms, q]);

  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <h1 className="text-[28px] font-bold warm-grad-text leading-none mb-4">Messages</h1>

        <div className="flex items-center gap-2 h-11 px-4 rounded-[16px] warm-input mb-3 mx-2">
          <Search className="h-4 w-4" style={{ color: "#6e5e48" }} strokeWidth={1.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#6e5e48] text-[#f5f0ea]"
          />
        </div>

        {rooms === null ? (
          <div className="space-y-2 mt-3 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[78px] rounded-[20px] warm-card neo-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="h-8 w-8 mx-auto mb-3" style={{ color: "#3e3222" }} strokeWidth={1.5} />
            <p className="text-sm mb-5" style={{ color: "#6e5e48" }}>{(rooms?.length ?? 0) === 0 ? "No conversations yet" : "No matches"}</p>
            {(rooms?.length ?? 0) === 0 && (
              <Link to="/discover" className="inline-block rounded-[13px] text-[13px] font-semibold warm-grad-bg" style={{ color: "#1a1410", padding: "10px 22px" }}>
                Find someone awake 🌙
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mt-1">
            {filtered.map((r) => r.other && (
              <ChatRow
                key={r.id}
                otherId={r.other.id}
                username={r.other.username}
                name={r.other.name}
                online={r.other.is_online}
                age={r.other.age ?? null}
                last={r.last}
                unread={unread[r.other.id] ?? 0}
                myId={user!.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ChatRow = memo(function ChatRow({ otherId, username, name, age, online, last, unread, myId }: {
  otherId: string;
  username: string;
  name: string | null;
  age: number | null;
  online: boolean;
  last: RoomRow["last"];
  unread: number;
  myId: string;
}) {
  const displayName = name || username;
  const myLast = last && last.sender_id === myId;
  return (
    <Link
      to="/messages/$userId"
      params={{ userId: otherId }}
      className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow mx-2"
    >
      <UserAvatar id={otherId} name={displayName} online={online} size={46} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: "#f5f0ea" }}>
          {displayName}
          {age ? <span className="ml-1.5 text-[13px] font-normal" style={{ color: "#8a7460" }}>· {age}</span> : null}
        </p>
        <p className="text-[12px] truncate mt-0.5" style={{ color: "#6e5e48" }}>
          {myLast ? "You: " : ""}{last?.content ?? "Say hello 🌙"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px]" style={{ color: "#5e5040" }}>{fmtTime(last?.created_at)}</span>
        {unread > 0 && (
          <span className="min-w-[20px] h-[18px] px-2 rounded-[10px] warm-grad-bg text-[10px] font-semibold flex items-center justify-center" style={{ color: "#1a1410" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
    </Link>
  );
});
