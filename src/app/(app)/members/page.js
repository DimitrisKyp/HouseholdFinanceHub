import Link from "next/link";
import InvitePanel from "@/components/Members/InvitePanel";
import MemberList from "@/components/Members/MemberList";
import Panel from "@/components/Panel";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { listMembers, listOpenInvites } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("members"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

const ROLES = ["owner", "editor", "viewer"];

export default async function MembersPage() {
  const { user, householdId, householdName, role, timezone } = await requireHousehold();
  const [locale, t, common] = await Promise.all([getLocale(), getTranslations("members"), getTranslations("common")]);
  const canManage = can(role, "members:manage");

  // Dates are formatted here, in the household's timezone, so server and browser agree.
  const formatDate = date =>
    new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(date);
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
    <Messages namespaces={["members"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-5 md:py-4">
        <main className="mx-auto flex w-full max-w-none flex-col gap-3">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-3xl">{householdName}</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{canManage ? t("intro.owner") : t("intro.member")}</p>
              </div>
              <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                {t("backToDashboard")}
              </Link>
            </div>
          </section>

          <div className="grid gap-3 xl:grid-cols-2">
            <Panel
              title={t("list.title", { count: members.length })}
              subtitle={canManage ? t("list.subtitleOwner") : t("list.subtitleMember")}
            >
              <MemberList members={members} canManage={canManage} currentUserId={user.id} />
            </Panel>

            <div className="flex flex-col gap-3">
              {canManage ? (
                <Panel title={t("invite.title")} subtitle={t("invite.subtitle")}>
                  <InvitePanel invites={invites} />
                </Panel>
              ) : null}
              <Panel title={t("roles.title")} subtitle={t("roles.subtitle")}>
                <ul className="space-y-2 text-xs leading-5">
                  {ROLES.map(name => (
                    <li key={name} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                      <p className="font-medium text-white">{common(`roles.${name}`)}</p>
                      <p className="mt-0.5 text-slate-400">{t(`roles.${name}`)}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </Messages>
  );
}
