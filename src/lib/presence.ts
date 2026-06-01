import { supabase } from "@/integrations/supabase/client";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startPresence(userId: string) {
  const updateOnline = async (status: boolean) => {
    try {
      await supabase
        .from("profiles")
        .update({
          is_online: status,
          last_seen: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } catch (e) {
      console.error("Error updating presence:", e);
    }
  };

  // Mark online immediately
  updateOnline(true);

  // Heartbeat every 20 seconds to keep presence alive
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => updateOnline(true), 20000);

  // Handle tab hidden/visible
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      updateOnline(false);
    } else {
      updateOnline(true);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => updateOnline(true), 20000);
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  // Keepalive fetch on tab/browser close (supabase client may not fire in time)
  const handleUnload = () => {
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID || "uavwrahakmzmfdwqwnek";
    const keys = [
      `sb-${projectRef}-auth-token`,
      `sb-${import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
    ];
    let token: string | null = null;
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
          if (token) break;
        }
      } catch { /* ignore */ }
    }
    if (token) {
      const now = new Date().toISOString();
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ is_online: false, last_seen: now, last_seen_at: now }),
          keepalive: true,
        }
      );
    }
  };
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("beforeunload", handleUnload);
    updateOnline(false);
  };
}
