"use client";

// Container: keeps every open page in step with the rest of the household (useLiveUpdates) and
// shows what changed (ToastStack). data-live also lets the browser tests wait for the connection.
import ToastStack from "@/components/Feedback/ToastStack";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";

export default function LiveUpdates() {
  const { connected, toasts, dismiss } = useLiveUpdates();
  return <ToastStack toasts={toasts} onDismiss={dismiss} data-live={connected ? "open" : "connecting"} />;
}
