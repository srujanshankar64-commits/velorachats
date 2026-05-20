import { supabase } from "@/integrations/supabase/client";

let beat: ReturnType<typeof setInterval> | null = null;

export function startPresence(userId: string) {
  const tick = async () => {
    await supabase.from("profiles").update({ is_online: true, last_seen: new Date().toISOString() }).eq("id", userId);
  };
  tick();
  beat = setInterval(tick, 30_000);
  const onHide = async () => {
    await supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", userId);
  };
  window.addEventListener("beforeunload", onHide);
  return () => {
    if (beat) clearInterval(beat);
    beat = null;
    window.removeEventListener("beforeunload", onHide);
    onHide();
  };
}
