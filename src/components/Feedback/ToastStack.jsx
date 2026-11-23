// Short messages in the corner of the screen, announced politely to screen readers.
// Presentational: the caller owns the list and decides when messages go away.
import { useTranslations } from "@/i18n/client";

export default function ToastStack({ toasts, onDismiss, ...rest }) {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2"
      {...rest}
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
            onClick={() => onDismiss(toast.id)}
            aria-label={t("dismiss")}
            className="-my-1 rounded-md px-1.5 text-slate-400 transition hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
