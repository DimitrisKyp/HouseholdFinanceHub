// Skeleton shown while a logged-in page loads its data (wrapped in Suspense by Next.js).
const block = "animate-pulse rounded-2xl border border-white/10 bg-white/5";

export default function AppLoading() {
  return (
    <div className="h-full overflow-hidden px-3 py-3 md:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto flex w-full flex-col gap-4">
        <div className={`${block} h-28`} />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className={`${block} h-80`} />
          <div className="space-y-4">
            <div className={`${block} h-36`} />
            <div className={`${block} h-40`} />
          </div>
        </div>
      </div>
    </div>
  );
}
