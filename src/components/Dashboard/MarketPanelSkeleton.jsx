// Shown while MarketPanel waits for the exchange rates and headlines.
import Panel from "@/components/Panel";
import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function MarketPanelSkeleton() {
  return (
    <Panel title="Markets & news" subtitle="Exchange rates and the latest business headlines.">
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <SkeletonBlock label="Loading exchange rates…" lines={4} />
        <SkeletonBlock label="Loading headlines…" lines={5} />
      </div>
    </Panel>
  );
}
