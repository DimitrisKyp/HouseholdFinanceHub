"use client"; // Error boundaries must be Client Components

// Last-resort fallback when the root layout itself fails. It replaces the root layout,
// so it brings its own <html>, <body> and styles.
import "./globals.css";
import ErrorState from "@/components/Feedback/ErrorState";

export default function GlobalError({ error, unstable_retry }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-full items-center bg-slate-950 px-4 text-white">
        <title>Something went wrong · Household Finance Hub</title>
        <ErrorState error={error} onRetry={() => unstable_retry()} />
      </body>
    </html>
  );
}
