import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — ShhChats" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("any");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? "");
        setName((data as { name?: string }).name ?? "");
        setBio(data.bio ?? "");
        setAge(data.age?.toString() ?? "");
        setCity((data as { city?: string }).city ?? "");
        setStateField((data as { state?: string }).state ?? "");
        setCountry(data.country ?? "");
        setGender(data.gender);
        setPrefer(data.prefer_gender);
      }
      setLoading(false);
    });
  }, [user]);

  async function save() {
    if (!user) return;
    const ageNum = age ? parseInt(age, 10) : null;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: username.trim().toLowerCase(),
      name: name.trim() || null,
      bio: bio.slice(0, 200),
      age: ageNum,
      city: city.trim() || null,
      state: stateField.trim() || null,
      country: country.slice(0, 60) || null,
      gender,
      prefer_gender: prefer,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  if (loading) return <div className="min-h-[100dvh] bg-black text-[#888] flex items-center justify-center text-sm">Loading…</div>;

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-md mx-auto px-4 pt-5 pb-8">
        <h1 className="text-[20px] mb-5">Profile</h1>

        <div className="space-y-3">
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" />
          </Field>
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age"><input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" /></Field>
            <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" /></Field>
            <Field label="State"><input value={stateField} onChange={(e) => setStateField(e.target.value)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm" /></Field>
          </div>
          <Field label="I am">
            <div className="grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`h-11 rounded-full text-sm capitalize transition-opacity duration-200 ${gender === g ? "bg-[#7C3AED] text-white" : "bg-[#1C1C1E] text-[#888]"}`}>{g}</button>
              ))}
            </div>
          </Field>
          <Field label="Match me with">
            <div className="grid grid-cols-3 gap-2">
              {([["female","Females"],["male","Males"],["any","Anyone"]] as const).map(([v,l]) => (
                <button key={v} onClick={() => setPrefer(v)} className={`h-11 rounded-full text-sm transition-opacity duration-200 ${prefer === v ? "bg-[#7C3AED] text-white" : "bg-[#1C1C1E] text-[#888]"}`}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={200} className="w-full px-4 py-3 rounded-2xl bg-[#1C1C1E] outline-none text-sm resize-none placeholder:text-[#666]" />
          </Field>

          <button onClick={save} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base">Save</button>
          <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="w-full h-12 rounded-full bg-transparent border border-white/20 text-sm text-[#888]">Sign out</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-[#888] mb-1.5 px-1">{label}</span>
      {children}
    </label>
  );
}
