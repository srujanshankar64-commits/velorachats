import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — ShhChats" },
      { name: "description", content: "Join public chat rooms on ShhChats: Dating, Friendship, and Open chat." },
    ],
  }),
  component: Rooms,
});

const ROOMS = [
  { id: "dating", title: "Dating Room", body: "For romantic connections", icon: Heart, color: "#ec4899" },
  { id: "friendship", title: "Friendship Room", body: "Casual friendly chats", icon: Users, color: "#7C3AED" },
  { id: "open", title: "Open Chat", body: "Anything goes", icon: Globe, color: "#22C55E" },
];

function Rooms() {
  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
        <h1 className="text-[20px] mb-4">Rooms</h1>
        <div className="flex flex-col gap-2">
          {ROOMS.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }} className="flex items-center gap-3 p-4 rounded-2xl bg-[#1C1C1E]">
                <div className="h-11 w-11 rounded-full flex items-center justify-center" style={{ background: r.color + "22" }}>
                  <Icon className="h-5 w-5" style={{ color: r.color }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{r.title}</p>
                  <p className="text-[12px] text-[#888]">{r.body}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
