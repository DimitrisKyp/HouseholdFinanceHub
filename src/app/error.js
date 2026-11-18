"use client"; // Error boundaries must be Client Components

import ErrorState from "@/components/Feedback/ErrorState";

// Catches errors in the route-group layouts (e.g. loading the session) and in the sign-in pages.
// Errors inside logged-in pages are caught closer, by (app)/error.js, which keeps the navigation.
export default function RootError({ error, unstable_retry }) {
  return (
    <div className="flex h-full items-center overflow-y-auto px-4 py-10">
      <ErrorState error={error} onRetry={() => unstable_retry()} />
    </div>
  );
}
