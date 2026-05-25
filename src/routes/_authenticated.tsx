import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startPresence } from "@/lib/presence";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      toast("Set up your profile first.");
      nav({ to: "/" });
    }
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    const cleanup = startPresence(user.id);
    return () => {
      cleanup();
    };
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setHasProfile(false);
          toast("Please complete your profile details.");
          nav({ to: "/profile" });
        } else {
          setHasProfile(true);
        }
      });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0D0D0F]">
        <Loader2 className="h-6 w-6 spin-slow text-[#8AB4F8]" />
      </div>
    );
  }
  return <AppShell><Outlet /></AppShell>;
}
