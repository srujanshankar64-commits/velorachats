import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — Velora" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("any");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setCountry(data.country ?? "");
        setAge(data.age?.toString() ?? "");
        setGender(data.gender);
        setPrefer(data.prefer_gender);
        setInterests((data.interests ?? []).join(", "));
      }
      setLoading(false);
    });
  }, [user]);

  async function save() {
    if (!user) return;
    const ageNum = age ? parseInt(age, 10) : null;
    const { error } = await supabase.from("profiles").update({
      username: username.trim().toLowerCase(),
      bio: bio.slice(0, 200),
      country: country.slice(0, 60) || null,
      age: ageNum,
      gender, prefer_gender: prefer,
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  }

  if (loading) return <div className="px-4 py-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold">Profile</h1>
        <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="glass-strong rounded-3xl p-5 space-y-3">
        <div>
          <label className="text-[11px] text-muted-foreground">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass outline-none text-sm mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass outline-none text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass outline-none text-sm mt-1" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="w-full px-3 py-2.5 rounded-xl glass text-sm mt-1 bg-transparent">
            <option className="bg-background" value="male">Male</option>
            <option className="bg-background" value="female">Female</option>
            <option className="bg-background" value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Match preference</label>
          <select value={prefer} onChange={(e) => setPrefer(e.target.value as typeof prefer)} className="w-full px-3 py-2.5 rounded-xl glass text-sm mt-1 bg-transparent">
            <option className="bg-background" value="female">Females</option>
            <option className="bg-background" value="male">Males</option>
            <option className="bg-background" value="any">Anyone</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={200} className="w-full px-3 py-2.5 rounded-xl glass outline-none text-sm mt-1 resize-none" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Interests (comma separated)</label>
          <input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="music, anime, coffee" className="w-full px-3 py-2.5 rounded-xl glass outline-none text-sm mt-1" />
        </div>
        <button onClick={save} className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> Save profile
        </button>
      </div>
    </div>
  );
}
