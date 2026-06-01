import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useState } from "react";
import { ChevronRight, LogOut, Shield, FileText, Mail, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ShhChats" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  username: string;
  name: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  gender: "male" | "female" | "other";
  prefer_gender: "male" | "female" | "any";
  created_at: string;
};

function ProfilePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);

  // edit fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("any");

  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [chatsCount, setChatsCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, friendsRes, chatsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("friendships")
          .select("requester_id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from("chat_rooms")
          .select("id", { count: "exact", head: true })
          .eq("type", "dm")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      ]);
      if (p) {
        const pp = p as Profile;
        setProfile(pp);
        setName(pp.name ?? "");
        setAge(pp.age?.toString() ?? "");
        setCity(pp.city ?? "");
        setStateField(pp.state ?? "");
        setGender(pp.gender);
        setPrefer(pp.prefer_gender);
      }
      setFriendsCount(friendsRes.count ?? 0);
      setChatsCount(chatsRes.count ?? 0);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    const ageNum = age ? parseInt(age, 10) : null;
    const { error } = await supabase.from("profiles").update({
      name: name.trim() || null,
      age: ageNum,
      city: city.trim() || null,
      state: stateField.trim() || null,
      gender,
      prefer_gender: prefer,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setProfile((p) => (p ? { ...p, name: name.trim() || null, age: ageNum, city: city.trim() || null, state: stateField.trim() || null, gender, prefer_gender: prefer } : p));
    setEditing(false);
  }

  if (!user || !profile) {
    return (
      <div className="min-h-[100dvh] warm-page flex items-center justify-center">
        <div className="space-y-3 w-full max-w-sm px-4">
          <div className="h-[120px] rounded-[20px] warm-card neo-shimmer" />
          <div className="h-[70px] rounded-[20px] warm-card neo-shimmer" />
          <div className="h-[50px] rounded-[20px] warm-card neo-shimmer" />
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.username;
  const memberSince = new Date(profile.created_at).toLocaleDateString([], { month: "short", year: "numeric" });

  return (
    <div className="min-h-[100dvh] warm-page">
      <div className="max-w-md mx-auto px-4 pt-5 pb-8">
        <h1 className="text-[28px] font-bold warm-grad-text leading-none mb-6">Profile</h1>

        {/* Avatar + name */}
        <div className="flex flex-col items-center mb-6">
          <UserAvatar id={profile.id} name={displayName} size={80} ringWidth={3} showOnlineDot={false} />
          <h2 className="text-[22px] font-bold warm-grad-text mt-3 leading-none">{displayName}</h2>
          <p className="text-[13px] mt-1.5" style={{ color: "#8a7460" }}>@{profile.username}</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 rounded-[20px] text-[14px] font-bold flex items-center gap-2 warm-grad-bg"
              style={{ color: "#1a1410", padding: "10px 28px" }}
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-stretch justify-between p-4 rounded-[16px] warm-card neo-shadow mb-3">
          <Stat n={friendsCount} label="Friends" />
          <Stat n={chatsCount} label="Chats" />
          <Stat n={memberSince} label="Since" small />
        </div>

        {editing ? (
          <div className="space-y-3 mb-4">
            <Field label="Display name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-12 px-4 rounded-[16px] warm-input outline-none text-[15px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} className="w-full h-12 px-4 rounded-[16px] warm-input outline-none text-[15px]" />
              </Field>
              <Field label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-12 px-4 rounded-[16px] warm-input outline-none text-[15px]" />
              </Field>
            </div>
            <Field label="State">
              <input value={stateField} onChange={(e) => setStateField(e.target.value)} className="w-full h-12 px-4 rounded-[16px] warm-input outline-none text-[15px]" />
            </Field>
            <Field label="I am">
              <div className="grid grid-cols-3 gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <Pill key={g} active={gender === g} onClick={() => setGender(g)}>{g}</Pill>
                ))}
              </div>
            </Field>
            <Field label="Match me with">
              <div className="grid grid-cols-3 gap-2">
                {([["female","Women"],["male","Men"],["any","Anyone"]] as const).map(([v,l]) => (
                  <Pill key={v} active={prefer === v} onClick={() => setPrefer(v)}>{l}</Pill>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setEditing(false)} className="h-12 rounded-[20px] text-[14px]" style={{ background: "#2a2318", color: "#f0ebe4", border: "0.5px solid #3e3222" }}>Cancel</button>
              <button onClick={save} className="h-12 rounded-[20px] text-[14px] font-bold warm-grad-bg" style={{ color: "#1a1410" }}>Save</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <SettingsItem icon={Shield} label="Safety" to="/safety" />
            <SettingsItem icon={FileText} label="Privacy" to="/privacy" />
            <SettingsItem icon={Mail} label="Contact" to="/contact" />
            <button
              onClick={async () => { await signOut(); nav({ to: "/" }); }}
              className="w-full flex items-center gap-3 p-[14px] rounded-[14px] warm-card neo-shadow text-left mx-0"
            >
              <LogOut className="h-4 w-4" style={{ color: "#6e5e48" }} strokeWidth={1.5} />
              <span className="text-[14px] flex-1" style={{ color: "#f5f0ea" }}>Sign out</span>
              <ChevronRight className="h-4 w-4" style={{ color: "#3e3222" }} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const Stat = memo(function Stat({ n, label, small }: { n: number | string; label: string; small?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span className={small ? "text-[14px] font-semibold" : "text-[18px] font-bold"} style={{ color: "#f5f0ea" }}>{n}</span>
      <span className="text-[11px] mt-0.5" style={{ color: "#6e5e48" }}>{label}</span>
    </div>
  );
});

const SettingsItem = memo(function SettingsItem({ icon: Icon, label, to }: { icon: typeof Shield; label: string; to: string }) {
  return (
    <Link to={to} className="w-full flex items-center gap-3 p-[14px] rounded-[14px] warm-card neo-shadow">
      <Icon className="h-4 w-4" style={{ color: "#6e5e48" }} strokeWidth={1.5} />
      <span className="text-[14px] flex-1" style={{ color: "#f5f0ea" }}>{label}</span>
      <ChevronRight className="h-4 w-4" style={{ color: "#3e3222" }} strokeWidth={1.5} />
    </Link>
  );
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block warm-section-label mb-2 px-1">{label}</span>
      {children}
    </label>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-[16px] text-[14px] capitalize"
      style={
        active
          ? { background: "linear-gradient(135deg, #ffffff, #f0e8dc)", color: "#1a1410", fontWeight: 600 }
          : { background: "#231d13", color: "#6e5e48", border: "0.5px solid #33291a" }
      }
    >
      {children}
    </button>
  );
}
