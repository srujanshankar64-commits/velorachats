import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({ meta: [{ title: "Room - Velora" }] }),
  component: Room,
});

type Msg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
};

const TITLES: Record<string, string> = {
  dating: "Dating Room",
  friendship: "Friendship Room",
  open: "Open Chat",
};

function Room() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("id, user_id, content, created_at, profiles:user_id(username)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !active || !data) return;

      const ordered = [...data].reverse();
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
      scrollToBottom();
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
          let username = profilesCache[msgUserId];
          
          if (!username && msgUserId) {
            const { data: pData } = await supabase.from("profiles").select("username").eq("id", msgUserId).single();
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

          setMsgs((prev) => prev.some((m) => m.id === completeMsg.id) ? prev : [...prev, completeMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, profilesCache]);

  const send = async () => {
    if (!input.trim() || !user?.id) return;
    const msgContent = input.trim();
    setInput("");

    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      content: msgContent,
    });

    if (error) toast.error("Failed to deliver message");
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white">
      <header className="h-14 px-3 flex items-center gap-3 bg-black border-b border-[#1C1C1E]">
        <button onClick={() => nav({ to: "/rooms" })} className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        <p className="text-sm font-semibold">{TITLES[roomId] || "Room"}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m) => {
          const isMine = m.user_id === user?.id;
          const uname = profilesCache[m.user_id] || m.username || "Loading...";
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && <span className="text-[11px] text-[#888] ml-2 mb-0.5">@{uname}</span>}
              <div className={`max-w-[80%] px-3.5 py-2.5 text-[15px] rounded-[18px] ${isMine ? "bg-[#7C3AED] text-white rounded-br-[4px]" : "bg-[#1C1C1E] text-white rounded-bl-[4px]"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="shrink-0 bg-black px-3 py-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex items-end gap-2 bg-[#1C1C1E] rounded-[20px] pl-4 pr-1.5 py-1.5 min-h-[44px]">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} placeholder="Message..." maxLength={1000} className="flex-1 bg-transparent outline-none text-[15px] py-2 placeholder:text-[#666]" />
          <button onClick={send} disabled={!input.trim()} className={`h-9 w-9 rounded-full bg-[#7C3AED] flex items-center justify-center transition-opacity ${input.trim() ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
