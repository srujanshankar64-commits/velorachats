cat > /mnt/user-data/outputs/rooms-roomId.tsx << 'EOF'
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Heart, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({ meta: [{ title: "Room - ShhChats" }] }),
  component: Room,
});

type Msg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  temp?: boolean;
};

const TITLES: Record<string, string> = {
  dating: "Dating Room",
  friendship: "Friendship Room",
  open: "Open Chat",
};

const ICONS: Record<string, any> = {
  dating: Heart,
  friendship: Users,
  open: Globe,
};

const COLORS: Record<string, string> = {
  dating: "#ec4899",
  friendship: "#7C3AED",
  open: "#22C55E",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function Room() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, string>>({});
  const profilesCacheRef = useRef<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync ref with state cache
  useEffect(() => {
    profilesCacheRef.current = profilesCache;
  }, [profilesCache]);

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    if (emojiPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // Supabase Presence for live user count
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel(`room_presence:${roomId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [roomId, user]);

  // Fetch messages and subscribe to inserts
  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      const { data: dbData, error } = await supabase
        .from("room_messages")
        .select("id, user_id, content, created_at, profiles:user_id(username)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !active || !dbData) return;

      const ordered = [...dbData].reverse();
      const cache: Record<string, string> = {};

      const mapped = ordered.map((m: any) => {
        const uname = m.profiles?.username || "unknown";
        cache[m.user_id] = uname;
        return {
          id: m.id,
          user_id: m.user_id,
          content: m.content,
          created_at: m.created_at,
          username: uname,
        };
      });

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
          const newMsg = payload.new as Record<string, any>;
          if (!newMsg) return;

          const msgUserId = String(newMsg.user_id || "");
          let username = profilesCacheRef.current[msgUserId];

          if (!username && msgUserId) {
            const { data: pData } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", msgUserId)
              .single();
            username = pData?.username || "unknown";
            setProfilesCache((prev) => ({ ...prev, [msgUserId]: username }));
          }

          const completeMsg: Msg = {
            id: String(newMsg.id || ""),
            user_id: msgUserId,
            content: String(newMsg.content || ""),
            created_at: String(newMsg.created_at || ""),
            username: username || "unknown",
          };

          // Replace temp message if it exists, otherwise add new
          setMsgs((prev) => {
            const hasReal = prev.some((m) => m.id === completeMsg.id);
            if (hasReal) return prev;
            // Remove matching temp message from same user with same content
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

    // Optimistic update — show message instantly
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Msg = {
      id: tempId,
      user_id: user.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      username: profilesCache[user.id] || "You",
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
      // Remove temp message on error
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleSelectEmoji = (emoji: { native: string }) => {
    setInput((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  const Icon = ICONS[roomId] || Globe;
  const iconColor = COLORS[roomId] || "#22C55E";

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0D0D0F] text-[#E8EAED]">
      {/* Top bar */}
      <header className="h-[60px] shrink-0 px-3 flex items-center gap-3 bg-[#1A1A1F] border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={() => nav({ to: "/rooms" })} className="p-2 -ml-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className="relative">
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: iconColor + "22" }}>
              <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={1.5} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#1A1A1F] bg-[#4ADE80]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[#E8EAED] truncate leading-tight font-medium">
              {TITLES[roomId] || "Room"}
            </p>
            <p className="text-[11px] text-[#9AA0A6] leading-tight">
              <span className="text-[#4ADE80] font-normal">{onlineCount} online</span>
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin chat-scroll"
        style={{ paddingBottom: 16 }}
      >
        <div className="text-center my-3">
          <span className="inline-block px-3 py-1 italic rounded-full bg-[#1A1A1F] text-[#9AA0A6] border-soft text-xs">
            You are in {TITLES[roomId] || "the Room"}. Say hello 🌙
          </span>
        </div>

        {msgs.map((m) => {
          const isMine = m.user_id === user?.id;
          const uname = profilesCache[m.user_id] || m.username || "...";
          return (
            <div key={m.id} className={`flex flex-col mb-1.5 ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && (
                <span className="text-[11px] text-[#9AA0A6] ml-2 mb-0.5 font-medium">
                  @{uname}
                </span>
              )}
              <div className="max-w-[80%]">
                <div
                  className={`px-3.5 py-2.5 text-[15px] break-words ${
                    isMine
                      ? "bg-[#8AB4F8] text-[#0D0D0F] rounded-[18px] rounded-br-[4px]"
                      : "bg-[#222228] text-[#E8EAED] rounded-[18px] rounded-bl-[4px]"
                  } ${m.temp ? "opacity-70" : "opacity-100"}`}
                >
                  {m.content}
                </div>
                <div
                  className={`mt-0.5 flex items-center gap-1 text-[11px] text-[#5F6368] ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{fmtTime(m.created_at)}</span>
                  {m.temp && <span className="text-[#5F6368]">•</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className="shrink-0 bg-[#0D0D0F] px-3 py-2 border-t border-[rgba(255,255,255,0.06)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="relative flex items-end gap-2 bg-[#2A2A32] rounded-[22px] pl-4 pr-1.5 py-1.5 min-h-[44px] border-soft">
          {emojiPickerOpen && (
            <div ref={pickerRef} className="absolute bottom-14 right-0 z-50">
              <Picker data={data} onEmojiSelect={handleSelectEmoji} theme="dark" set="native" />
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message…"
            rows={1}
            maxLength={1000}
            className="flex-1 bg-transparent outline-none text-[16px] resize-none py-2 leading-5 placeholder:text-[#5F6368] max-h-[120px] text-[#E8EAED]"
          />
          <button
            type="button"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            className="h-10 w-10 flex items-center justify-center text-[#9AA0A6] hover:text-white"
            aria-label="Choose emoji"
          >
            😊
          </button>
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-opacity duration-200 ${
              input.trim() ? "bg-[#8AB4F8] opacity-100" : "bg-[#222228] opacity-100"
            }`}
          >
            <ArrowUp
              className={`h-5 w-5 ${input.trim() ? "text-[#0D0D0F]" : "text-[#5F6368]"}`}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
EOF