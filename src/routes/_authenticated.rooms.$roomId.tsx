import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Heart, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Room — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Room,
});

type Msg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  name?: string | null;
  temp?: boolean;
};

const TITLES: Record<string, string> = {
  dating: "Dating Room",
  friendship: "Friendship Room",
  open: "Open Chat",
};
const ICONS: Record<string, typeof Heart> = {
  dating: Heart,
  friendship: Users,
  open: Globe,
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function Room() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, { username: string; name: string | null }>>({});
  const profilesCacheRef = useRef<Record<string, { username: string; name: string | null }>>({});
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { profilesCacheRef.current = profilesCache; }, [profilesCache]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // Presence
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel(`room_presence:${roomId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(presenceChannel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [roomId, user]);

  // Messages
  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      const { data: dbData, error } = await supabase
        .from("room_messages")
        .select("id, user_id, content, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !active || !dbData) return;

      const ordered = [...dbData].reverse();
      const userIds = Array.from(new Set(ordered.map((m) => m.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,name")
        .in("id", userIds);

      const cache: Record<string, { username: string; name: string | null }> = {};
      (profs ?? []).forEach((p) => { cache[p.id] = { username: p.username || "unknown", name: (p as { name?: string | null }).name ?? null }; });

      const mapped: Msg[] = ordered.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        username: cache[m.user_id]?.username || "unknown",
        name: cache[m.user_id]?.name ?? null,
      }));
      setProfilesCache((prev) => ({ ...prev, ...cache }));
      setMsgs(mapped);
    };

    fetchMessages();

    const channel = supabase
      .channel(`room_messages:room_id=eq.${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as { id?: string; user_id?: string; content?: string; created_at?: string };
          if (!newMsg) return;
          const msgUserId = String(newMsg.user_id || "");
          let cached = profilesCacheRef.current[msgUserId];

          if (!cached && msgUserId) {
            const { data: pData } = await supabase
              .from("profiles")
              .select("username,name")
              .eq("id", msgUserId)
              .single();
            cached = { username: pData?.username || "unknown", name: pData?.name ?? null };
            setProfilesCache((prev) => ({ ...prev, [msgUserId]: cached! }));
          }

          const completeMsg: Msg = {
            id: String(newMsg.id || ""),
            user_id: msgUserId,
            content: String(newMsg.content || ""),
            created_at: String(newMsg.created_at || ""),
            username: cached?.username || "unknown",
            name: cached?.name ?? null,
          };

          setMsgs((prev) => {
            if (prev.some((m) => m.id === completeMsg.id)) return prev;
            const filtered = prev.filter(
              (m) => !(m.temp && m.user_id === completeMsg.user_id && m.content === completeMsg.content)
            );
            return [...filtered, completeMsg];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const send = async () => {
    if (!input.trim() || !user?.id) return;
    const msgContent = input.trim();
    setInput("");
    inputRef.current?.focus();

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Msg = {
      id: tempId,
      user_id: user.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      username: profilesCache[user.id]?.username || "You",
      name: profilesCache[user.id]?.name ?? null,
      temp: true,
    };
    setMsgs((prev) => [...prev, tempMsg]);

    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      content: msgContent,
    });

    if (error) {
      toast.error("Failed to deliver message");
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const Icon = ICONS[roomId] || Globe;
  const title = TITLES[roomId] || "Room";

  return (
    <div className="flex flex-col h-[100dvh] warm-page" style={{ background: "#141008" }}>
      <header className="h-[58px] shrink-0 px-3 flex items-center gap-3" style={{ background: "#1a1512", borderBottom: "0.5px solid #2e2618" }}>
        <button onClick={() => nav({ to: "/rooms" })} className="p-2 -ml-2" aria-label="Back" style={{ color: "#f0ebe4" }}>
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full warm-grad-bg flex items-center justify-center">
            <Icon className="h-4.5 w-4.5" style={{ color: "#1a1410" }} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold truncate warm-grad-text leading-tight">{title}</p>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: "#8a7460" }}>
              <span style={{ color: "#6dbf6a" }}>● </span>{onlineCount} online
            </p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin chat-scroll" style={{ paddingBottom: 16 }}>
        <div className="text-center my-3">
          <span className="inline-block px-3 py-1 italic rounded-full text-[11px]" style={{ background: "#201c14", color: "#8a7460", border: "0.5px solid #2e2618" }}>
            You're in {title}. Say hello 🌙
          </span>
        </div>

        {msgs.map((m) => {
          const isMine = m.user_id === user?.id;
          const cached = profilesCache[m.user_id];
          const uname = cached?.name || cached?.username || m.name || m.username || "…";
          return (
            <RoomBubble key={m.id} m={m} mine={isMine} uname={uname} />
          );
        })}
      </div>

      <div
        className="shrink-0 px-3 py-2"
        style={{
          background: "#141008",
          borderTop: "0.5px solid #2e2618",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="flex items-end gap-2 pl-4 pr-1.5 py-1.5 min-h-[48px] rounded-[24px]" style={{ background: "#201c14", border: "0.5px solid #332a1c" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={1000}
            className="flex-1 bg-transparent outline-none text-[16px] resize-none py-2 leading-5 max-h-[120px]"
            style={{ color: "#f5f0ea" }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#2a2318",
              opacity: input.trim() ? 1 : 0.6,
            }}
          >
            <ArrowUp className="h-5 w-5" style={{ color: input.trim() ? "#1a1410" : "#6e5e48" }} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

const RoomBubble = memo(function RoomBubble({ m, mine, uname }: { m: Msg; mine: boolean; uname: string }) {
  return (
    <div className={`flex mb-2 ${mine ? "justify-end" : "justify-start gap-2"}`}>
      {!mine && <UserAvatar id={m.user_id} name={uname} size={32} showOnlineDot={false} ringWidth={1.5} />}
      <div className="max-w-[75%]">
        {!mine && (
          <span className="text-[11px] block mb-0.5 ml-1 font-medium" style={{ color: "#8a7460" }}>
            {uname}
          </span>
        )}
        <div
          className="px-3.5 py-2.5 text-[15px] break-words"
          style={{
            background: mine ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#201c14",
            color: mine ? "#1a1410" : "#f5f0ea",
            border: mine ? "none" : "0.5px solid #2e2618",
            borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            opacity: m.temp ? 0.7 : 1,
          }}
        >
          {m.content}
        </div>
        <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "justify-end" : "justify-start"}`} style={{ color: "#5e5040" }}>
          <span>{fmtTime(m.created_at)}</span>
        </div>
      </div>
    </div>
  );
});
