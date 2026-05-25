import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ShhChats" },
      { name: "description", content: "Sign up or sign in to ShhChats. Free, no email verification." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/discover" });
  }, [user, authLoading, nav]);

  async function guest() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      nav({ to: "/discover" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start guest");
      setBusy(false);
    }
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        if (!agree) throw new Error("Please accept the Terms and Privacy Policy");
        if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const ageNum = age ? parseInt(age, 10) : null;
        if (ageNum !== null && (ageNum < 13 || ageNum > 100)) throw new Error("Age must be between 13 and 100");

        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim().toLowerCase(),
              name: name.trim() || null,
              age: ageNum?.toString() ?? "",
              gender,
              city: city.trim() || null,
              state: stateField.trim() || null,
            },
          },
        });
        if (error) throw error;
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="h-14 px-5 flex items-center">
        <Link to="/" className="p-2 -ml-2 text-[#888]"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col items-center mb-6">
<span className="h-14 w-14 rounded-xl bg-[#8AB4F8] text-[#0D0D0F] grid place-items-center text-3xl mb-3">🤫</span>
         <h1 className="text-[28px] text-center">Welcome to ShhChats</h1>
          </div>

          {mode === "choose" ? (
            <>
              <button onClick={guest} disabled={busy} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="h-5 w-5 spin-slow" />} Continue as guest
              </button>
              <p className="mt-2.5 text-[12px] text-[#888] text-center">No email needed</p>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#1C1C1E]" />
                <span className="text-[12px] text-[#888]">or</span>
                <div className="flex-1 h-px bg-[#1C1C1E]" />
              </div>

              <button onClick={() => setMode("email")} className="w-full h-14 rounded-full bg-transparent border border-white/30 text-white text-base">
                Sign up with email
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-1 mb-4 p-1 rounded-full bg-[#1C1C1E]">
                {(["signup", "signin"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-full text-sm ${tab === t ? "bg-[#7C3AED] text-white" : "text-[#888]"}`}>
                    {t === "signup" ? "Sign up" : "Sign in"}
                  </button>
                ))}
              </div>

              <form onSubmit={handle} className="space-y-2.5">
                {tab === "signup" && (
                  <>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={20} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                      <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm">
                        <option value="other">Other</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                      <input value={stateField} onChange={(e) => setStateField(e.target.value)} placeholder="State" className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                    </div>
                  </>
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />

                {tab === "signup" && (
                  <label className="flex items-start gap-2 px-1 py-2 text-[12px] text-[#888]">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#7C3AED]" />
                    <span>
                      I agree to the{" "}
                      <a href="https://www.termsfeed.com/live/82620bf7-04c5-4f57-ac5f-7ef3f8e56a29" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED]">Terms</a> and{" "}
                      <a href="https://www.termsfeed.com/live/1e0211fa-64de-478c-a7d9-bdd1e79c7d11" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED]">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                <button type="submit" disabled={busy} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy && <Loader2 className="h-5 w-5 spin-slow" />}
                  {tab === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>
              <button onClick={() => setMode("choose")} className="mt-4 w-full text-[13px] text-[#888]">← Back to options</button>
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-[#555]">
            <a href="https://www.termsfeed.com/live/82620bf7-04c5-4f57-ac5f-7ef3f8e56a29" target="_blank" rel="noopener noreferrer">Terms</a> ·{" "}
            <a href="https://www.termsfeed.com/live/1e0211fa-64de-478c-a7d9-bdd1e79c7d11" target="_blank" rel="noopener noreferrer">Privacy</a> ·{" "}
            <Link to="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
