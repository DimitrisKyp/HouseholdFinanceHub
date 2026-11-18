import Link from "next/link";
import InvitePanel from "@/components/Members/InvitePanel";
import MemberList from "@/components/Members/MemberList";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import { listMembers, listOpenInvites } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Members · Household Finance Hub" };

const ROLE_DESCRIPTIONS = [
  ["Owner", "Full control: budgets, members and household settings. There is exactly one owner."],
  ["Editor", "Can add and edit expenses, budgets and goals. Can't manage members."],
  ["Viewer", "Read-only access, for people who only need to see where things stand."],
];

export default async function MembersPage() {
  const { user, householdId, householdName, role, timezone } = await requireHousehold();
  const canManage = can(role, "members:manage");

  // Dates are formatted here, in the household's timezone, so server and browser agree.
  const formatDate = date =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(date);
  const now = new Date();

  const members = (await listMembers(householdId)).map(({ joinedAt, ...member }) => ({ ...member, joinedLabel: formatDate(joinedAt) }));
  const invites = canManage
    ? (await listOpenInvites(householdId)).map(({ expiresAt, ...invite }) => ({
        ...invite,
        expired: expiresAt <= now,
        expiresLabel: formatDate(expiresAt),
      }))
    : [];

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-5 md:py-4">
      <main className="mx-auto flex w-full max-w-none flex-col gap-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">Household members</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-3xl">{householdName}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                {canManage
                  ? "Invite the people you live with. They choose their own password and can help track expenses and goals, but only you can manage members."
                  : "The people sharing this household. Only the owner can invite or remove members."}
              </p>
            </div>
            <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
              Back to dashboard
            </Link>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title={`Members (${members.length})`} subtitle={canManage ? "Change a role or remove someone." : "Who has access."}>
            <MemberList members={members} canManage={canManage} currentUserId={user.id} />
          </Panel>

          <div className="flex flex-col gap-3">
            {canManage ? (
              <Panel
                title="Invite someone"
                subtitle="They'll get an email with a link to choose a password and join. Links work for 7 days."
              >
                <InvitePanel invites={invites} />
              </Panel>
            ) : null}
            <Panel title="Roles" subtitle="What each role can do.">
              <ul className="space-y-2 text-xs leading-5">
                {ROLE_DESCRIPTIONS.map(([name, description]) => (
                  <li key={name} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="font-medium text-white">{name}</p>
                    <p className="mt-0.5 text-slate-400">{description}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
