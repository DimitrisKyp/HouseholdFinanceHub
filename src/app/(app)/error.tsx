"use client"; // Error boundaries must be Client Components

import ErrorState from "@/components/Feedback/ErrorState";

// Catches errors in any logged-in page; the side navigation (layout) stays usable.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex h-full items-center overflow-y-auto px-3 py-6">
      <ErrorState error={error} onRetry={() => retry()} />
    </div>
  );
}
