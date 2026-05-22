import { useEffect } from "react";

/** Detect a right-swipe (back gesture) on touch devices. */
export function useSwipeBack(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let startX = 0;
    let startY = 0;
    let startT = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; startT = Date.now();
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dx > 60 && Math.abs(dy) < 40 && dt < 500 && startX < 80) onBack();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onBack, enabled]);
}
