import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Shuffle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Velora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("female");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/discover" });
  }, [user, authLoading, nav]);

  async function guest() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      toast.success("You're in ✨");
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
        const ageNum = parseInt(age, 10);
        if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");
        if (!ageNum || ageNum < 13) throw new Error("You must be at least 13");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim().toLowerCase(), gender, prefer_gender: prefer, age: String(ageNum) },
          },
        });
        if (error) throw error;
        // Auto-confirm is enabled → sign them in right away
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
        toast.success("Welcome to Velora! ✨");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
            <span className="text-xl font-display font-bold neon-text">Velora</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Jump in</h1>
        </div>

        {/* GUEST: Most prominent option */}
        <button onClick={guest} disabled={busy} className="w-full mb-3 py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
          Continue as guest
        </button>
        <p className="text-[11px] text-muted-foreground text-center mb-5">Fastest way — no email, no verification.</p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or use email</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <div className="glass-strong rounded-3xl p-5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl glass mb-4">
            {(["signup", "signin"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-3">
            {tab === "signup" && (
              <>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={20} className="w-full px-4 py-3 rounded-xl glass outline-none focus:ring-2 focus:ring-primary text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" required min={13} max={100} className="px-3 py-3 rounded-xl glass outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="px-3 py-3 rounded-xl glass outline-none text-sm bg-transparent col-span-2">
                    <option className="bg-background" value="male">I am male</option>
                    <option className="bg-background" value="female">I am female</option>
                    <option className="bg-background" value="other">Other</option>
                  </select>
                </div>
                <select value={prefer} onChange={(e) => setPrefer(e.target.value as typeof prefer)} className="w-full px-3 py-3 rounded-xl glass text-sm bg-transparent">
                  <option className="bg-background" value="female">Match me with: Females</option>
                  <option className="bg-background" value="male">Match me with: Males</option>
                  <option className="bg-background" value="any">Match me with: Anyone</option>
                </select>
              </>
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-3 rounded-xl glass outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (6+ characters)" required minLength={6} className="w-full px-4 py-3 rounded-xl glass outline-none focus:ring-2 focus:ring-primary text-sm" />

            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl glass-strong font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-3">No email verification needed.</p>
        </div>
      </div>
    </div>
  );
}
