import type { Metadata } from "next";
import Link from "next/link";
import ChangePasswordForm from "@/components/Account/ChangePasswordForm";
import HouseholdSettingsForm from "@/components/Account/HouseholdSettingsForm";
import LanguageForm from "@/components/Account/LanguageForm";
import ProfileForm from "@/components/Account/ProfileForm";
import ThemeForm from "@/components/Account/ThemeForm";
import Panel from "@/components/Panel";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { CURRENCIES, currentTheme, THEMES, timezones } from "@/lib/preferences";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("account"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

export default async function AccountPage() {
  const { user, householdName, role, currency, timezone } = await requireHousehold();
  const [theme, locale, t, common] = await Promise.all([
    currentTheme(),
    getLocale(),
    getTranslations("account"),
    getTranslations("common"),
  ]);
  const canManageHousehold = can(role, "household:manage");

  return (
    <Messages namespaces={["account"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full max-w-none flex-col gap-3">
          {/* A slim heading: the top bar above already shows whose account this is. */}
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
              <span className="mr-3 text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</span>
              {t("heading")}
            </h1>
            <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit shrink-0" })}>
              {t("backToDashboard")}
            </Link>
          </div>

          {/* Wide screens: three columns, so the whole page fits on one screen without scrolling. */}
          <div className={`grid items-start gap-3 md:grid-cols-2 ${canManageHousehold ? "xl:grid-cols-3" : ""}`}>
            <div className="flex flex-col gap-3">
              <Panel
                title={t("profile.title")}
                subtitle={t("profile.subtitle", { household: householdName, role: common(`roles.${role}`) })}
              >
                <ProfileForm name={user.name} email={user.email} />
              </Panel>
              <Panel title={t("appearance.title")} subtitle={t("appearance.subtitle")}>
                <div className="space-y-4">
                  <LanguageForm locale={locale} options={LOCALES.map(value => ({ value, label: LOCALE_NAMES[value] }))} />
                  <ThemeForm theme={theme} options={THEMES.map(value => ({ value, label: t(`appearance.themes.${value}`) }))} />
                </div>
              </Panel>
            </div>
            {canManageHousehold ? (
              <Panel title={t("household.title")} subtitle={t("household.subtitle")}>
                <HouseholdSettingsForm
                  household={{ name: householdName, currency, timezone }}
                  currencies={CURRENCIES}
                  timezones={timezones()}
                />
              </Panel>
            ) : null}
            <Panel title={t("password.title")} subtitle={t("password.subtitle")}>
              <ChangePasswordForm />
            </Panel>
          </div>
        </main>
      </div>
    </Messages>
  );
}
