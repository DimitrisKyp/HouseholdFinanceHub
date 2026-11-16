import Link from "next/link";
import ChangePasswordForm from "@/components/Account/ChangePasswordForm";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Account · Household Finance Hub" };

export default async function AccountPage() {
  const { user, householdName, role } = await requireHousehold();

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-5 md:py-4">
      <main className="mx-auto flex w-full max-w-none flex-col gap-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">Account</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-3xl">Your sign-in and security.</h1>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Profile" subtitle="How you appear to your household.">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Name</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Household</dt>
                <dd className="font-medium">
                  {householdName} · {ROLE_LABELS[role]}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Change password" subtitle="We’ll email you when your password changes.">
            <ChangePasswordForm />
          </Panel>
        </div>
      </main>
    </div>
  );
}
