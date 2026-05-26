import { supabase } from "@/integrations/supabase/client";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startPresence(userId: string) {
  const updateOnline = async (status: boolean) => {
    try {
      await supabase
        .from("profiles")
        .update({
          is_online: status,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", userId);
    } catch (e) {
      console.error("Error updating presence:", e);
    }
  };

  // Initial online heartbeat
  updateOnline(true);

  // Send heartbeat every 20 seconds
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    updateOnline(true);
  }, 20000);

  // Handle visibility change (tab hidden/visible)
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      updateOnline(false);
    } else {
      updateOnline(true);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        updateOnline(true);
      }, 20000);
    }
  };

  document.addEventListener("visibilitychange", handleVisibility);

  // Keepalive fetch for tab close
  const handleUnload = () => {
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID || "uavwrahakmzmfdwqwnek";
    const dataStr = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        const token = parsed?.currentSession?.access_token;
        if (token) {
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
            {
              method: "PATCH",
              headers: {
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() }),
              keepalive: true
            }
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
  };
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("beforeunload", handleUnload);
    updateOnline(false);
  };
}
