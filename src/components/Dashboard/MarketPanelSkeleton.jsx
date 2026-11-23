// Shown while MarketPanel waits for the exchange rates and headlines.
import Panel from "@/components/Panel";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { getTranslations } from "@/i18n/server";

export default async function MarketPanelSkeleton() {
  const t = await getTranslations("dashboard");
  return (
    <Panel title={t("market.title")} subtitle={t("market.loadingSubtitle")}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <SkeletonBlock label={t("market.loadingRates")} lines={4} />
        <SkeletonBlock label={t("market.loadingHeadlines")} lines={5} />
      </div>
    </Panel>
  );
}
