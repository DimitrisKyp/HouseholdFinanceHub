import Link from "next/link";
import ChangePasswordForm from "@/components/Account/ChangePasswordForm";
import HouseholdSettingsForm from "@/components/Account/HouseholdSettingsForm";
import ProfileForm from "@/components/Account/ProfileForm";
import ThemeForm from "@/components/Account/ThemeForm";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { CURRENCIES, currentTheme, THEME_LABELS, THEMES, timezones } from "@/lib/preferences";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Account · Household Finance Hub" };

export default async function AccountPage() {
  const { user, householdName, role, currency, timezone } = await requireHousehold();
  const theme = await currentTheme();
  const canManageHousehold = can(role, "household:manage");

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-5 md:py-4">
      <main className="mx-auto flex w-full max-w-none flex-col gap-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">Account</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-3xl">Your profile, theme and security.</h1>
            </div>
            <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
              Back to dashboard
            </Link>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Profile" subtitle={`How you appear to your household: ${householdName} · ${ROLE_LABELS[role]}.`}>
            <ProfileForm name={user.name} email={user.email} />
          </Panel>
          <Panel title="Appearance" subtitle="Saved to your account, so it follows you to other devices.">
            <ThemeForm theme={theme} options={THEMES.map(value => ({ value, label: THEME_LABELS[value] }))} />
          </Panel>
          {canManageHousehold ? (
            <Panel title="Household settings" subtitle="Only the owner can change these.">
              <HouseholdSettingsForm
                household={{ name: householdName, currency, timezone }}
                currencies={CURRENCIES}
                timezones={timezones()}
              />
            </Panel>
          ) : null}
          <Panel title="Change password" subtitle="We’ll email you when your password changes.">
            <ChangePasswordForm />
          </Panel>
        </div>
      </main>
    </div>
  );
}
