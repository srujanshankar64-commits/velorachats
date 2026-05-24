import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) {
      toast("Set up your profile first.");
      nav({ to: "/" });
    }
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
