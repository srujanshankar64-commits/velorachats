import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { startPresence } from "@/lib/presence";
import { AppShell } from "@/components/app-shell";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGlobalDMListener } from "@/hooks/use-notifications";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Get active chat userId from route params (works on /messages/$userId)
  const params = useParams({ strict: false }) as any;
  const activeChatUserId = params?.userId ?? null;

  // 🔔 Global DM notification listener
  useGlobalDMListener({
    currentUserId: user?.id,
    activeChatUserId,
  });

  // Register service worker + handle notification click → navigate
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "OPEN_CHAT" && e.data.chatUserId) {
          nav({ to: "/messages/$userId", params: { userId: e.data.chatUserId } });
        }
      });
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      nav({ to: "/messages/$userId", params: { userId: detail.chatUserId } });
    };
    window.addEventListener("velora:openChat", handler);
    return () => window.removeEventListener("velora:openChat", handler);
  }, [nav]);

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
