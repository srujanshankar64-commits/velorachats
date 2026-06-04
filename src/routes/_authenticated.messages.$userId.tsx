import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Image, MoreHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unread";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useSwipeBack } from "@/lib/use-swipe-back";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({
    meta: [
      { title: "Chat — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DMChat,
});

type Msg = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  delivered_at?: string | null;
  status?: string;
  is_image?: boolean;
  _local?: boolean;
};
type Other = { id: string; username: string; name: string | null; is_online: boolean };

const CRISIS_RE = /\b(suicide|kill myself|end it|hurt myself|want to die)\b/i;
const MAX_IMG_SIZE = 1.5 * 1024 * 1024; // 1.5 MB limit after compression

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Compress image to base64, max 800px wide, quality 0.7
function compressImage(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const base64 = await fileToBase64(file);
      const img = new window.Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width <= MAX && file.size < MAX_IMG_SIZE) {
          resolve(base64);
          return;
        }
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => {
        // Fallback: resolve original if compression fails
        resolve(base64);
      };
      img.src = base64;
    } catch (err) {
      reject(err);
    }
  });
}

function DMChat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const { markRead, total: unreadTotal } = useUnread();
  const nav = useNavigate();
  const goBack = useCallback(() => nav({ to: "/messages" }), [nav]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null); // base64 preview before send
  const [imgSending, setImgSending] = useState(false);
  const [showImgMenu, setShowImgMenu] = useState(false);
  const [openedImages, setOpenedImages] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const otherTypingTimerRef = useRef<number | null>(null);
  const inset = useKeyboardInset();
  useSwipeBack(goBack);

  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ShhChats` : "ShhChats";
    return () => { document.title = "ShhChats"; };
  }, [unreadTotal]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prof }, { data: rid, error }] = await Promise.all([
        supabase.from("profiles").select("id,username,name,is_online").eq("id", userId).single(),
        supabase.rpc("get_or_create_dm", { target: userId }),
      ]);
      if (!active) return;
      if (prof) setOther(prof as Other);
      if (error) return toast.error(error.message);
      setRoomId(rid as string);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id,sender_id,content,created_at,read_at,delivered_at,status,is_image")
        .eq("room_id", rid as string)
        .order("created_at")
        .limit(100);
      if (!active) return;
      if (msgs) setMessages(msgs as Msg[]);
      markRead(userId);

      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("room_id", rid as string)
        .neq("sender_id", user.id)
        .eq("is_image", false)
        .is("read_at", null);
    })();
    return () => { active = false; };
  }, [userId, user, markRead]);

  // Real-time: messages + typing + online status
  useEffect(() => {
    if (!roomId || !user) return;

    // Single unified channel for messages (with client-side filtering) and typing broadcast
    const msgCh = supabase
      .channel(`room:${roomId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (m.room_id !== roomId) return;

          setMessages((prev) => {
            const idx = prev.findIndex((x) => x._local && x.sender_id === m.sender_id && x.content === m.content);
            if (idx >= 0) { const copy = prev.slice(); copy[idx] = m; return copy; }
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id !== user.id) {
            markRead(userId);
            // Mark as read immediately → triggers DB delete for images (only for non-image messages)
            if (!m.is_image) {
              supabase.from("messages")
                .update({ read_at: new Date().toISOString() })
                .eq("id", m.id)
                .then(() => {});
            }
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (m.room_id !== roomId) return;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const deleted = payload.old as { id: string };
          // Check if deleted message was in our state, and preserve if it is an image
          setMessages((prev) => prev.filter((x) => x.id !== deleted.id || x.is_image));
        })
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { from: string; typing: boolean };
        if (p.from === userId) {
          setOtherTyping(p.typing);
          if (otherTypingTimerRef.current) window.clearTimeout(otherTypingTimerRef.current);
          if (p.typing) {
            otherTypingTimerRef.current = window.setTimeout(() => setOtherTyping(false), 2500);
          }
        }
      })
      .subscribe();

    typingChRef.current = msgCh;

    const onlineCh = supabase
      .channel(`presence:${userId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as { is_online: boolean };
          setOther((prev) => prev ? { ...prev, is_online: updated.is_online } : prev);
        })
      .subscribe();

    if (user) {
      supabase.from("profiles").update({ is_online: true, last_seen: new Date().toISOString() }).eq("id", user.id).then(() => {});
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", user.id).then(() => {});
      } else {
        supabase.from("profiles").update({ is_online: true }).eq("id", user.id).then(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      msgCh.unsubscribe();
      onlineCh.unsubscribe();
      typingChRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (otherTypingTimerRef.current) window.clearTimeout(otherTypingTimerRef.current);
    };
  }, [roomId, user, userId, markRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  function broadcastTyping(typing: boolean) {
    const ch = typingChRef.current;
    if (!ch || !user) return;
    ch.send({ type: "broadcast", event: "typing", payload: { from: user.id, typing } });
  }

  function onInputChange(v: string) {
    setInput(v);
    broadcastTyping(true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => broadcastTyping(false), 1500);
  }

  async function send() {
    const text = input.trim();
    if (!text || !roomId || !user) return;
    setInput("");
    broadcastTyping(false);
    if (CRISIS_RE.test(text)) setCrisis(true);

    const tempId = "local-" + Date.now();
    const optimistic: Msg = {
      id: tempId, sender_id: user.id, content: text,
      created_at: new Date().toISOString(), status: "sending", _local: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, sender_id: user.id, content: text })
      .select("id,sender_id,content,created_at,read_at,delivered_at,status,is_image")
      .single();

    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      toast.error("Couldn't send");
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Msg) : m)));
    }
  }

  // Pick image from gallery
  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image too large (max 10MB)");

    try {
      const base64 = await compressImage(file);
      setImgPreview(base64);
    } catch {
      toast.error("Couldn't load image");
    }
    // Reset input so same file can be picked again
    e.target.value = "";
  }

  // Send the previewed image
  async function sendImage() {
    if (!imgPreview || !roomId || !user) return;
    setImgSending(true);

    const tempId = "local-img-" + Date.now();
    const optimistic: Msg = {
      id: tempId, sender_id: user.id, content: imgPreview,
      created_at: new Date().toISOString(), status: "sending", is_image: true, _local: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setImgPreview(null);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, sender_id: user.id, content: imgPreview, is_image: true })
      .select("id,sender_id,content,created_at,read_at,delivered_at,status,is_image")
      .single();

    setImgSending(false);
    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      toast.error(`Couldn't send image: ${error.message}`);
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Msg) : m)));
    }
  }

  const handleOpenImage = useCallback(async (msgId: string) => {
    setOpenedImages((prev) => ({ ...prev, [msgId]: true }));
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", msgId);
  }, []);

  async function blockUser() {
    if (!user) return;
    await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
    toast.success("User blocked.");
    setMenuOpen(false);
    goBack();
  }

  async function reportUser(reason: string) {
    if (!user) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_id: userId, reason });
    toast.success("Report submitted.");
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const myLastSentId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id && !messages[i]._local) return messages[i].id;
    }
    return null;
  }, [messages, user?.id]);

  const displayName = other?.name || other?.username || "";

  return (
    <div className="flex flex-col h-[100dvh] warm-page" style={{ background: "#141008" }}>
      {/* Top bar */}
      <header className="h-[58px] shrink-0 px-3 flex items-center gap-3" style={{ background: "#1a1512", borderBottom: "0.5px solid #2e2618" }}>
        <button onClick={goBack} className="p-2 -ml-2" aria-label="Back" style={{ color: "#f0ebe4" }}>
          <ArrowLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
        {other && (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <UserAvatar id={other.id} name={displayName} online={other.is_online} size={36} onlineRingColor="#1a1512" />
            <div className="min-w-0 flex flex-col">
              <p className="text-[16px] font-semibold truncate warm-grad-text leading-tight">{displayName}</p>
              <p className="text-[11px]" style={{ color: other.is_online ? "#6dbf6a" : "#5e5040" }}>
                {other.is_online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        )}
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2" aria-label="More" style={{ color: "#f0ebe4" }}>
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin chat-scroll" style={{ paddingBottom: 16 }}>
        <div className="text-center my-3">
          <span className="inline-block px-3 py-1 text-[11px] italic rounded-full" style={{ background: "#201c14", color: "#8a7460", border: "0.5px solid #2e2618" }}>
            You're both up late. Say hello 🌙
          </span>
        </div>
        {messages.map((m) => (
          <Bubble
            key={m.id}
            m={m}
            mine={m.sender_id === user!.id}
            myLastSentId={myLastSentId}
            opened={openedImages[m.id]}
            onOpen={handleOpenImage}
          />
        ))}
        {crisis && (
          <div className="text-center my-3">
            <span className="inline-block px-3 py-1.5 text-[11px] rounded-full" style={{ background: "rgba(240,164,112,0.12)", color: "#f0a070", border: "0.5px solid rgba(240,164,112,0.20)" }}>
              💙 iCall: 9152987821 · Vandrevala: 1860-2662-345
            </span>
          </div>
        )}
        {otherTyping && (
          <div className="flex justify-start mb-1">
            <div className="rounded-[18px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1" style={{ background: "#201c14", border: "0.5px solid #2e2618" }}>
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-1" style={{ background: "#8a7460" }} />
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-2" style={{ background: "#8a7460" }} />
              <span className="h-1.5 w-1.5 rounded-full dot-bounce-3" style={{ background: "#8a7460" }} />
            </div>
          </div>
        )}
      </div>

      {/* Image preview before send */}
      {imgPreview && (
        <div className="shrink-0 px-3 pb-2">
          <div className="relative inline-block rounded-[16px] overflow-hidden" style={{ border: "0.5px solid #3a2e1e" }}>
            <img src={imgPreview} alt="Preview" className="max-h-[160px] max-w-[240px] object-cover block" />
            <button
              onClick={() => setImgPreview(null)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <X className="w-3.5 h-3.5" style={{ color: "#fff" }} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex justify-end" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
              <button
                onClick={sendImage}
                disabled={imgSending}
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #ffffff, #f0e8dc)" }}
              >
                <ArrowUp className="h-4 w-4" style={{ color: "#1a1410" }} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <p className="text-[11px] mt-1" style={{ color: "#6e5e48" }}>
            🔥 Disappears after your friend sees it
          </p>
        </div>
      )}

      {/* Input bar */}
      <div
        className="shrink-0 px-3 py-2"
        style={{
          background: "#141008",
          borderTop: "0.5px solid #2e2618",
          paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)`,
          transform: inset ? `translateY(-${inset}px)` : undefined,
          transition: "transform 200ms ease",
        }}
      >
        <div className="flex items-end gap-2 pl-3 pr-1.5 py-1.5 min-h-[48px] rounded-[24px]" style={{ background: "#201c14", border: "0.5px solid #332a1c" }}>
          {/* Hidden gallery input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickImage}
          />
          {/* Hidden camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={pickImage}
          />
          {/* Image picker button */}
          <button
            onClick={() => setShowImgMenu(true)}
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center"
            style={{ color: "#6e5e48" }}
            aria-label="Send image"
          >
            <Image className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent outline-none text-[16px] resize-none py-2 leading-5 max-h-[120px]"
            style={{ color: "#f5f0ea" }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send"
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#2a2318",
              opacity: input.trim() ? 1 : 0.6,
            }}
          >
            <ArrowUp className="h-5 w-5" style={{ color: input.trim() ? "#1a1410" : "#6e5e48" }} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom sheet menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setMenuOpen(false)}>
          <div
            className="w-full rounded-t-3xl p-4 fade-up"
            style={{ background: "#201c14", border: "0.5px solid #2e2618", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-10 rounded-full mx-auto mb-4" style={{ background: "#3e3222" }} />
            <button onClick={() => reportUser("Spam")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report spam</button>
            <button onClick={() => reportUser("Harassment")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report harassment</button>
            <button onClick={() => reportUser("Inappropriate")} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#f5f0ea" }}>Report inappropriate</button>
            <button onClick={blockUser} className="w-full h-12 text-left px-3 rounded-xl text-sm" style={{ color: "#F87171" }}>Block this person</button>
            <button onClick={() => setMenuOpen(false)} className="w-full h-12 mt-2 rounded-full text-sm" style={{ background: "#141008", color: "#f5f0ea" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Camera / Gallery chooser */}
      {showImgMenu && (
        <div
          className="fixed inset-0 z-[70]"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowImgMenu(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] p-5 pb-10"
            style={{ background: "#1c1610", border: "1px solid #3a2e1e" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "#3a2e1e" }} />
            </div>
            <p className="text-[13px] font-semibold mb-4 px-1" style={{ color: "#8a7460" }}>Send a photo</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowImgMenu(false); setTimeout(() => cameraInputRef.current?.click(), 100); }}
                className="flex flex-col items-center gap-2 py-5 rounded-[18px]"
                style={{ background: "#231d13", border: "0.5px solid #33291a" }}
              >
                <span className="text-[32px] leading-none">📷</span>
                <span className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>Camera</span>
                <span className="text-[11px]" style={{ color: "#6e5e48" }}>Take a photo</span>
              </button>
              <button
                onClick={() => { setShowImgMenu(false); setTimeout(() => fileInputRef.current?.click(), 100); }}
                className="flex flex-col items-center gap-2 py-5 rounded-[18px]"
                style={{ background: "#231d13", border: "0.5px solid #33291a" }}
              >
                <span className="text-[32px] leading-none">🖼️</span>
                <span className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>Gallery</span>
                <span className="text-[11px]" style={{ color: "#6e5e48" }}>Pick from photos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Bubble = memo(function Bubble({
  m,
  mine,
  myLastSentId,
  opened,
  onOpen,
}: {
  m: Msg;
  mine: boolean;
  myLastSentId: string | null;
  opened?: boolean;
  onOpen?: (id: string) => void;
}) {
  const isMyLast = mine && myLastSentId === m.id;
  const failed = m.status === "failed";
  const sending = m._local && m.status === "sending";
  const seen = !!m.read_at;
  const delivered = !!m.delivered_at;

  const showPlaceholder = m.is_image && !mine && !m.read_at && !opened;

  return (
    <div className={`flex mb-1.5 ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        {m.is_image ? (
          showPlaceholder ? (
            <button
              onClick={() => onOpen?.(m.id)}
              className="px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left"
              style={{
                background: "#201c14",
                color: "#f5f0ea",
                border: "1px dashed #5e5040",
                borderRadius: "18px 18px 18px 4px",
                outline: "none",
              }}
            >
              <span className="text-xl">📷</span>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#f0e8dc] leading-tight">View Once Photo</span>
                <span className="text-[11px] text-[#8a7460] font-normal mt-0.5">Tap to view • Will disappear after opened</span>
              </div>
            </button>
          ) : (
            // Image bubble
            <div
              className="overflow-hidden"
              style={{
                borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                border: mine ? "none" : "0.5px solid #2e2618",
                opacity: sending ? 0.7 : 1,
                position: "relative",
              }}
            >
              <img
                src={m.content}
                alt="Photo"
                className="block max-w-[220px] max-h-[280px] object-cover"
                style={{ display: "block" }}
              />
              {!mine && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]"
                  style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)" }}
                >
                  🔥 Disappears after you see this
                </div>
              )}
            </div>
          )
        ) : (
          // Text bubble
          <div
            className="px-3.5 py-2.5 text-[15px] break-words"
            style={{
              background: mine ? "linear-gradient(135deg, #ffffff, #f0e8dc)" : "#201c14",
              color: mine ? "#1a1410" : "#f5f0ea",
              border: mine ? "none" : "0.5px solid #2e2618",
              borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              opacity: sending ? 0.7 : 1,
            }}
          >
            {m.content}
          </div>
        )}
        <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "justify-end" : "justify-start"}`} style={{ color: "#5e5040" }}>
          <span>{fmtTime(m.created_at)}</span>
          {mine && isMyLast && (
            failed ? <span style={{ color: "#F87171" }}>failed</span>
            : sending ? <span style={{ color: "#5e5040" }}>sending…</span>
            : seen ? <span style={{ color: "#6dbf6a" }}>✓✓ seen</span>
            : delivered ? <span style={{ color: "#8a7460" }}>✓✓ delivered</span>
            : <span style={{ color: "#8a7460" }}>✓ sent</span>
          )}
          {m.is_image && mine && !sending && (
            <span style={{ color: "#8a7460" }}>· 🔥 ephemeral</span>
          )}
        </div>
      </div>
    </div>
  );
});
