import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signalUnreadChanged } from "@/lib/unread-signal";

const TOAST_MS = 6_000;
const MAX_TOASTS = 3;
// Several changes in a row (e.g. someone logging a few expenses) cause one refresh.
const REFRESH_DELAY_MS = 300;

/**
 * Listens to /api/events (Server-Sent Events, see lib/live.js). When someone else changes
 * something, the page's data is refreshed and a short message is queued; a new notification
 * tells the unread badge to check again. After a dropped connection it catches up.
 * Returns { connected, toasts: [{ id, message }], dismiss(id) }.
 */
export function useLiveUpdates() {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const [connected, setConnected] = useState(false);
  const nextId = useRef(0);

  const dismiss = useCallback(id => setToasts(list => list.filter(toast => toast.id !== id)), []);

  useEffect(() => {
    const source = new EventSource("/api/events");
    let refreshTimer;
    let reconnecting = false;
    const timers = new Set();
    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    };
    const showToast = message => {
      const id = ++nextId.current;
      setToasts(list => [...list, { id, message }].slice(-MAX_TOASTS));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setToasts(list => list.filter(toast => toast.id !== id));
      }, TOAST_MS);
      timers.add(timer);
    };

    source.addEventListener("change", event => {
      let change;
      try {
        change = JSON.parse(event.data);
      } catch {
        return;
      }
      if (change.kind === "notifications") {
        signalUnreadChanged();
        return;
      }
      // Your own changes are already on screen (the form's action refreshed the page).
      if (change.mine) return;
      refreshSoon();
      if (change.message) showToast(change.message);
    });
    source.addEventListener("error", () => {
      reconnecting = true;
      setConnected(false);
    });
    source.addEventListener("open", () => {
      setConnected(true);
      if (!reconnecting) return;
      reconnecting = false;
      refreshSoon();
      signalUnreadChanged();
    });

    return () => {
      source.close();
      clearTimeout(refreshTimer);
      timers.forEach(clearTimeout);
    };
  }, [router]);

  return { connected, toasts, dismiss };
}
