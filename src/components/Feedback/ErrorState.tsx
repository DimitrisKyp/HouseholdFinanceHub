"use client";

// Fallback shown by the route error boundaries (error.js). Server error details are never shown:
// in production Next.js replaces them with a digest that matches the server log.
import Link from "next/link";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";
import { reportClientError, thrownDetails } from "@/lib/telemetry-client";

type ErrorStateProps = {
  // What Next.js passes to error.tsx: usually an Error with a `digest` that matches the server
  // log, but typed `unknown` because a Client Component can throw any value.
  error: unknown;
  onRetry: () => void;
  homeHref?: string;
};

export default function ErrorState({ error, onRetry, homeHref = "/" }: ErrorStateProps) {
  const t = useTranslations("errors");
  const { digest } = thrownDetails(error);
  useEffect(() => {
    console.error(error);
    // Errors caught by an error boundary never reach window.onerror, so report them here.
    const { message, digest } = thrownDetails(error);
    reportClientError(digest ? `${message} (digest ${digest})` : message, "boundary");
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-center text-white">
      <p className="text-sm font-semibold tracking-[0.3em] text-rose-300 uppercase">{t("somethingWrong")}</p>
      <h1 className="mt-3 text-xl font-semibold">{t("couldntLoad")}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">{t("temporary")}</p>
      {digest ? <p className="mt-3 font-mono text-xs text-slate-500">{t("reference", { digest })}</p> : null}
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={onRetry} className={buttonClasses({ variant: "primary", size: "sm" })}>
          {t("tryAgain")}
        </button>
        <Link
          href={homeHref}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          {t("goToDashboard")}
        </Link>
      </div>
    </div>
  );
}
