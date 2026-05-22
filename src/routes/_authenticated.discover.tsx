import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — Velora" }] }),
  component: Discover,
});

type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null; is_online: boolean };

function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"online" | "all">("online");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    let query = supabase.from("profiles").select("id,username,avatar_url,bio,is_online").neq("id", user.id).limit(80);
    if (filter === "online") query = query.eq("is_online", true);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    query.order("is_online", { ascending: false }).order("last_seen", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, filter, q]);

  const list = useMemo(() => profiles, [profiles]);

  async function openDM(targetId: string) {
    const { error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6">
        <h1 className="text-[20px] mb-4">Discover</h1>
        <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#1C1C1E] mb-3">
          <Search className="h-4 w-4 text-[#666]" strokeWidth={1.5} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666]" />
        </div>
        <div className="flex gap-2 mb-3">
          {(["online", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 h-8 rounded-full text-xs transition-opacity duration-200 ${filter === f ? "bg-[#7C3AED] text-white" : "bg-[#1C1C1E] text-[#888]"}`}>
              {f === "online" ? "Online" : "Everyone"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-[#0d0d0e]" />)}</div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-[#888] py-12">No people found</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((p) => <Card key={p.id} p={p} onClick={() => openDM(p.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

const Card = memo(function Card({ p, onClick }: { p: Profile; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 h-[72px] px-2 rounded-2xl hover:bg-[#1C1C1E] transition-opacity duration-200 text-left">
      <div className="relative shrink-0">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-[#7C3AED] flex items-center justify-center text-sm">{p.username[0]?.toUpperCase()}</div>
        )}
        {p.is_online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{p.username}</p>
        <p className="text-[13px] text-[#888] truncate">{p.bio || (p.is_online ? "online" : "offline")}</p>
      </div>
    </button>
  );
});
