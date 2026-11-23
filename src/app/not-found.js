import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("errors"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("notFound.metaTitle") }) };
}

// Shown for unknown URLs and whenever a page calls notFound().
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="flex h-full items-center overflow-y-auto px-4 py-10">
      <main className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">404</p>
        <h1 className="mt-3 text-2xl font-semibold">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{t("notFound.body")}</p>
        <Link href="/" className={buttonClasses({ variant: "primary", size: "sm", className: "mt-5" })}>
          {t("goToDashboard")}
        </Link>
      </main>
    </div>
  );
}
