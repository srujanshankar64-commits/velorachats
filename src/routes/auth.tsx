import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Velora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [prefer, setPrefer] = useState<"male" | "female" | "any">("female");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/random" });
  }, [user, authLoading, nav]);

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-bold">V</div>
            <span className="text-xl font-display font-bold neon-text">Velora</span>
          </div>
          <h1 className="text-2xl font-display font-bold">{tab === "signin" ? "Welcome back" : "Join the chat"}</h1>
        </div>

        <div className="glass-strong rounded-3xl p-5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl glass mb-5">
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
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

            <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-4">By continuing you agree to be kind and respectful.</p>
        </div>
      </div>
    </div>
  );
}
