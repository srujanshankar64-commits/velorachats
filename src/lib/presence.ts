import { supabase } from "@/integrations/supabase/client";

export function startPresence(userId: string) {
  // 1. Join Realtime presence channel
  const presenceChannel = supabase.channel("global-presence", {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  // 2. Set database status to online
  const markOnline = async () => {
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  };

  const markOffline = async () => {
    await supabase
      .from("profiles")
      .update({ is_online: false, last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  };

  const track = async () => {
    if (presenceChannel.state === "joined" || presenceChannel.state === "joining") {
      await presenceChannel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
      await markOnline();
    }
  };

  const untrack = async () => {
    await presenceChannel.untrack();
    await markOffline();
  };

  presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await track();
    }
  });

  // Handle visibility change (tab hidden/visible)
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      untrack();
    } else {
      track();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Handle window beforeunload (tab close)
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
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleUnload);
    presenceChannel.untrack().then(() => {
      presenceChannel.unsubscribe();
    });
    markOffline();
  };
}
