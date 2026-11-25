// Skeleton shown while a logged-in page loads its data (wrapped in Suspense by Next.js).
import { getTranslations } from "@/i18n/server";

const block = "animate-pulse rounded-2xl border border-white/10 bg-white/5";

export default async function AppLoading() {
  const t = await getTranslations("errors");
  return (
    <div className="h-full overflow-hidden px-3 py-3 md:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div className="mx-auto flex w-full flex-col gap-4 lg:h-full">
        <div className={`${block} h-28 shrink-0`} />
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.4fr_0.9fr] lg:grid-rows-1">
          <div className={`${block} h-80 lg:h-auto`} />
          <div className="flex flex-col gap-4">
            <div className={`${block} h-36 shrink-0`} />
            <div className={`${block} h-40 lg:h-auto lg:flex-1`} />
          </div>
        </div>
      </div>
    </div>
  );
}
