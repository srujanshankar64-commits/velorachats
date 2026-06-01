import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { UserAvatar } from "../components/UserAvatar";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverComponent,
});

type Profile = {
  id: string;
  username: string;
  name: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  is_online: boolean;
};

function DiscoverComponent() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"online" | "everyone">("everyone");

  useEffect(() => {
    async function fetchProfiles() {
      let query = supabase.from("profiles").select("id,username,name,age,city,state,is_online");
      
      const { data, error } = await query;
      if (!error && data) {
        setProfiles(data as Profile[]);
      }
    }
    fetchProfiles();
  }, []);

  const displayedProfiles = useMemo(() => {
    if (filter === "online") {
      return profiles.filter((p) => p.is_online);
    }
    return [...profiles].sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0));
  }, [profiles, filter]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white tracking-tight">Discover</h1>
      
      <div className="flex gap-2">
        <Button 
          variant={filter === "online" ? "default" : "secondary"} 
          onClick={() => setFilter("online")}
        >
          Online
        </Button>
        <Button 
          variant={filter === "everyone" ? "default" : "secondary"} 
          onClick={() => setFilter("everyone")}
        >
          Everyone
        </Button>
      </div>

      <div className="space-y-3">
        {displayedProfiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-4">
              <UserAvatar id={p.id} name={p.name || p.username} online={p.is_online} size={46} />
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {p.name || p.username}
                  {p.age && <span className="text-zinc-400 text-sm font-normal">· {p.age}</span>}
                </h3>
                <p className="text-xs text-zinc-400">{p.city || p.state || "Anonymous Location"}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-white border-zinc-700 bg-zinc-800 hover:bg-zinc-700">+ Add</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
