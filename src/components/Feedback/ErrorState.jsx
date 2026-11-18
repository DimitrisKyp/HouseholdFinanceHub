"use client";

// Fallback shown by the route error boundaries (error.js). Server error details are never shown:
// in production Next.js replaces them with a digest that matches the server log.
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorState({ error, onRetry, homeHref = "/" }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-center text-white">
      <p className="text-sm font-semibold tracking-[0.3em] text-rose-300 uppercase">Something went wrong</p>
      <h1 className="mt-3 text-xl font-semibold">We couldn&apos;t load this page.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        It may be a temporary problem with the connection or the database. Try again, and if it keeps happening, come back later.
      </p>
      {error?.digest ? <p className="mt-3 font-mono text-xs text-slate-500">Reference: {error.digest}</p> : null}
      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
