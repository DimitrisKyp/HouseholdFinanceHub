"use client";

// A modal built on the native <dialog> (showModal): the browser traps focus inside it, closes it
// on Escape, puts it above everything and makes the rest of the page inert. A click on the
// backdrop closes it too. placement "sheet" slides in from the right; "center" is a dialog box.
import { useEffect, useId, useRef } from "react";
import { useTranslations } from "@/i18n/client";

const PLACEMENT = {
  sheet:
    "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-lg border-l motion-safe:transition-transform motion-safe:duration-300 starting:open:translate-x-full",
  center: "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card border",
};

export default function Modal({ open, onClose, title, description, placement = "sheet", children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const t = useTranslations("common");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={event => event.target === dialog.current && onClose()}
      className={`border-line overflow-y-auto bg-slate-900 p-0 text-white shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm ${PLACEMENT[placement]}`}
    >
      <div className="border-line flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 id={titleId} className="font-semibold text-white">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-0.5 text-xs text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label={t("close")}
          className="border-line rounded-full border p-2 text-slate-400 transition hover:border-white/30 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
