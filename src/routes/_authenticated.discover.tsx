import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — Velora" }] }),
  component: Discover,
});

type Profile = {
  id: string; username: string; avatar_url: string | null;
  gender: string; age: number | null; country: string | null;
  bio: string | null; is_online: boolean; interests: string[] | null;
};

function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "male" | "female">("all");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    let query = supabase.from("profiles").select("id,username,avatar_url,gender,age,country,bio,is_online,interests").neq("id", user?.id ?? "").limit(60);
    if (filter === "online") query = query.eq("is_online", true);
    if (filter === "male" || filter === "female") query = query.eq("gender", filter);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    query.order("is_online", { ascending: false }).order("last_seen", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, filter, q]);

  async function openDM(targetId: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm", { target: targetId });
    if (error) return toast.error(error.message);
    nav({ to: "/messages/$userId", params: { userId: targetId } });
    void data;
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-4">Discover</h1>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 glass rounded-xl px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username" className="flex-1 bg-transparent outline-none py-2.5 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin -mx-1 px-1">
        {(["all", "online", "female", "male"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${filter === f ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No profiles yet. Be the first to chat!</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {profiles.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-3 flex flex-col">
              <div className="relative mx-auto mb-2">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" loading="lazy" className="h-16 w-16 rounded-full" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-lg">{p.username[0]?.toUpperCase()}</div>
                )}
                {p.is_online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 ring-2 ring-background" />}
              </div>
              <p className="text-center font-semibold text-sm truncate">{p.username}</p>
              <p className="text-center text-[11px] text-muted-foreground capitalize truncate">{p.gender}{p.age ? ` · ${p.age}` : ""}{p.country ? ` · ${p.country}` : ""}</p>
              {p.bio && <p className="text-center text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.bio}</p>}
              <button onClick={() => openDM(p.id)} className="mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold">
                <MessageCircle className="h-3.5 w-3.5" /> Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
