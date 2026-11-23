"use client"; // Error boundaries must be Client Components

// Last-resort fallback when the root layout itself fails. It replaces the root layout (and its
// translations), so it brings its own <html>, <body> and styles, and says everything in English
// and Greek.
import { useEffect } from "react";
import "./globals.css";
import { buttonClasses } from "@/components/ui/Button";
import { reportClientError } from "@/lib/telemetry-client";

export default function GlobalError({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error?.digest ? `${error.message} (digest ${error.digest})` : error?.message, "boundary");
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="flex h-full items-center bg-slate-950 px-4 text-white">
        <title>Something went wrong · Household Hub</title>
        <div role="alert" className="mx-auto max-w-md rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-center text-white">
          <h1 className="text-xl font-semibold">We couldn&apos;t load this page.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Please try again in a moment.</p>
          <p lang="el" className="mt-4 text-xl font-semibold">
            Δεν ήταν δυνατή η φόρτωση της σελίδας.
          </p>
          <p lang="el" className="mt-2 text-sm leading-6 text-slate-300">
            Δοκιμάστε ξανά σε λίγο.
          </p>
          {error?.digest ? <p className="mt-3 font-mono text-xs text-slate-500">Reference / Κωδικός: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            className={buttonClasses({ variant: "primary", size: "sm", className: "mt-5" })}
          >
            Try again / Δοκιμάστε ξανά
          </button>
        </div>
      </body>
    </html>
  );
}
