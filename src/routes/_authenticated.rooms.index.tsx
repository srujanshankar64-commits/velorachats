import { createFileRoute, Link } from "@tanstack/react-router";
import { memo } from "react";
import { Heart, Users, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Rooms — ShhChats" },
      { name: "description", content: "Join public chat rooms on ShhChats: Dating, Friendship, and Open chat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Rooms,
});

const ROOMS = [
  { id: "dating", title: "Dating Room", body: "For romantic connections", icon: Heart, idx: 0 },
  { id: "friendship", title: "Friendship Room", body: "Casual friendly chats", icon: Users, idx: 1 },
  { id: "open", title: "Open Chat", body: "Anything goes", icon: Globe, idx: 2 },
] as const;

const GRADS = [
  { from: "#e8845a", to: "#c45a8a", ringFrom: "#f0a070", ringTo: "#d46a9a" },
  { from: "#4a90d4", to: "#8b58c8", ringFrom: "#60a8e0", ringTo: "#9b70d4" },
  { from: "#3ab868", to: "#2a8898", ringFrom: "#50c878", ringTo: "#3a9aaa" },
];

function Rooms() {
  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <h1 className="text-[28px] font-bold warm-grad-text leading-none mb-5">Rooms</h1>
        <div className="flex flex-col gap-2">
          {ROOMS.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

const RoomCard = memo(function RoomCard({ room }: { room: typeof ROOMS[number] }) {
  const g = GRADS[room.idx % GRADS.length];
  const Icon = room.icon;
  const gradId = `grad-room-${room.id}`;
  return (
    <Link
      to="/rooms/$roomId"
      params={{ roomId: room.id }}
      className="flex items-center gap-[13px] p-[14px] rounded-[20px] warm-card neo-shadow mx-2"
    >
      <div className="relative shrink-0" style={{ width: 46, height: 46 }}>
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: 46, height: 46, background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
        >
          <Icon className="h-5 w-5" style={{ color: "#ffffff" }} strokeWidth={2} />
        </div>
        <svg className="absolute pointer-events-none" style={{ top: -2, left: -2 }} width={50} height={50} viewBox="0 0 50 50" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={g.ringFrom} />
              <stop offset="100%" stopColor={g.ringTo} />
            </linearGradient>
          </defs>
          <circle cx={25} cy={25} r={24} fill="none" stroke={`url(#${gradId})`} strokeWidth={2} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: "#f5f0ea" }}>{room.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "#5e5040" }}>{room.body}</p>
      </div>
      <span
        className="rounded-[13px] text-[12px] font-semibold warm-grad-bg"
        style={{ padding: "8px 15px", color: "#1a1410" }}
      >
        Join
      </span>
    </Link>
  );
});
