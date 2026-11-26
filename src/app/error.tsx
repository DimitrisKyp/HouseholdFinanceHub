"use client"; // Error boundaries must be Client Components

import ErrorState from "@/components/Feedback/ErrorState";

// Catches errors in the route-group layouts (e.g. loading the session) and in the sign-in pages.
// Errors inside logged-in pages are caught closer, by (app)/error.tsx, which keeps the navigation.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex h-full items-center overflow-y-auto px-4 py-10">
      <ErrorState error={error} onRetry={() => retry()} />
    </div>
  );
}
