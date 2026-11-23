// Placeholder shapes while something loads. Hidden from screen readers; the surrounding
// region says what's loading instead (aria-busy and a visually hidden label).
export default function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

/** A labelled loading region with a few skeleton lines. */
export function SkeletonBlock({ label = "Loading…", lines = 3, className = "" }) {
  return (
    <div role="status" aria-busy="true" className={`space-y-2 ${className}`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`h-4 ${index === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
