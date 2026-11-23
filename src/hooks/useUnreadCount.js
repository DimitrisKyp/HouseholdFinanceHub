import { useEffect, useState } from "react";
import { UNREAD_CHANGED_EVENT } from "@/lib/unread-signal";

/**
 * The unread notification count. Starts from the server's count and asks again after each
 * navigation (pass the pathname), when the window regains focus, and when told a notification
 * arrived (live, see useLiveUpdates and lib/unread-signal.js).
 */
export function useUnreadCount(initial, pathname) {
  const [unread, setUnread] = useState(initial);
  // A fresh count from the server replaces the local one.
  const [serverCount, setServerCount] = useState(initial);
  if (initial !== serverCount) {
    setServerCount(initial);
    setUnread(initial);
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (response.ok && !cancelled) setUnread((await response.json()).unread);
      } catch {
        // Offline or the server is restarting: keep the last count.
      }
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener(UNREAD_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
      window.removeEventListener(UNREAD_CHANGED_EVENT, load);
    };
  }, [pathname]);

  return unread;
}
