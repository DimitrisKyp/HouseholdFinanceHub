import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CreateHouseholdForm from "@/components/Auth/CreateHouseholdForm";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";
import { getMembership, requireUser } from "@/lib/dal";

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.onboarding") }) };
}

// Shown to a signed-in user who doesn't belong to any household yet.
export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/");
  const t = await getTranslations("auth");

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold">{t("onboarding.title", { name: user.name })}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">{t("onboarding.intro")}</p>
      <CreateHouseholdForm />
    </Messages>
  );
}
