"use client";

// Keeps every open page in step with the rest of the household. Listens to /api/events (Server-Sent
// Events, see lib/live.js): when someone else adds an expense or changes the budget, goals or members,
// the page reloads its data and a short message says what happened. A new notification updates the
// unread badge, for the person who caused it too.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signalUnreadChanged } from "@/lib/unread-signal";

const TOAST_MS = 6_000;
const MAX_TOASTS = 3;
// Several changes in a row (e.g. someone logging a few expenses) cause one refresh.
const REFRESH_DELAY_MS = 300;

export default function LiveUpdates() {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  // Exposed as data-live, which also lets the browser tests wait until the connection is open.
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
    // After a dropped connection (server restart, laptop asleep), catch up on anything missed.
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

  return (
    <div
      role="status"
      aria-live="polite"
      data-live={connected ? "open" : "connecting"}
      className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/50"
        >
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
          <p className="min-w-0 flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="-my-1 rounded-md px-1.5 text-slate-400 transition hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
