import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Velora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/messages" });
  }, [user, authLoading, nav]);

  async function guest() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      nav({ to: "/random" });
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
        if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim().toLowerCase() },
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

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <h1 className="text-[32px] text-center mb-8">Welcome to Velora</h1>

          {mode === "choose" ? (
            <>
              <button
                onClick={guest}
                disabled={busy}
                className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-5 w-5 spin-slow" />}
                Continue as guest
              </button>
              <p className="mt-2.5 text-[12px] text-[#888] text-center">No email verification needed</p>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[#1C1C1E]" />
                <span className="text-[12px] text-[#888]">or</span>
                <div className="flex-1 h-px bg-[#1C1C1E]" />
              </div>

              <button
                onClick={() => setMode("email")}
                className="w-full h-14 rounded-full bg-transparent border border-white/30 text-white text-base"
              >
                Sign up with email
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-1 mb-5 p-1 rounded-full bg-[#1C1C1E]">
                {(["signup", "signin"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-full text-sm transition-opacity duration-200 ${tab === t ? "bg-[#7C3AED] text-white" : "text-[#888]"}`}>
                    {t === "signup" ? "Sign up" : "Sign in"}
                  </button>
                ))}
              </div>

              <form onSubmit={handle} className="space-y-3">
                {tab === "signup" && (
                  <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={20} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                <button type="submit" disabled={busy} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy && <Loader2 className="h-5 w-5 spin-slow" />}
                  {tab === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>
              <p className="mt-2.5 text-[12px] text-[#888] text-center">No email verification needed</p>
              <button onClick={() => setMode("choose")} className="mt-5 w-full text-[13px] text-[#888]">← Back to options</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
