import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { rich } from "@/components/Auth/rich";
import { AcceptInviteButton, NewAccountInviteForm } from "@/components/Invite/AcceptInviteForms";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";
import { signOutAction } from "@/lib/actions/auth";
import { getMembership, getSession } from "@/lib/dal";
import { getInviteByToken } from "@/lib/invites";
import { buttonClasses } from "@/components/ui/Button";

// The token is in the URL: don't leak it to other sites through the Referer header.
export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.invite") }), referrer: "no-referrer" };
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-3 space-y-4 text-sm leading-6 text-slate-300">{children}</div>
    </>
  );
}

const linkClass = "text-cyan-300 hover:text-cyan-200";
const strong = (value: ReactNode) => <span className="font-medium text-white">{value}</span>;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);

  if (!invite) {
    return (
      <Notice title={t("invite.notFoundTitle")}>
        <p>{t("invite.notFoundBody")}</p>
      </Notice>
    );
  }
  if (invite.status === "accepted") {
    return (
      <Notice title={t("invite.acceptedTitle")}>
        <p>
          {t("invite.acceptedBody")}{" "}
          <Link href="/sign-in" className={linkClass}>
            {t("invite.acceptedSignIn")}
          </Link>{" "}
          {t("invite.acceptedRest")}
        </p>
      </Notice>
    );
  }
  if (invite.status === "revoked" || invite.status === "expired") {
    const expired = invite.status === "expired";
    return (
      <Notice title={expired ? t("invite.expiredTitle") : t("invite.revokedTitle")}>
        <p>
          {expired ? t("invite.expiredBody") : t("invite.revokedBody")} {t("invite.askNew", { name: invite.inviterName })}
        </p>
      </Notice>
    );
  }

  const invitedAs = invite.role === "viewer" ? "invite.invitedAsViewer" : "invite.invitedAsEditor";
  const intro = (
    <>
      <h1 className="text-2xl font-semibold text-slate-300">{t("invite.join", { household: invite.householdName })}</h1>
      <p className="mt-1 mb-6 text-sm leading-6 text-slate-400">
        {rich(t(invitedAs, { inviter: invite.inviterName }), {
          role: <span className="font-medium text-slate-200">{common(`roles.${invite.role}`)}</span>,
        })}{" "}
        {t(`invite.summary.${invite.role === "viewer" ? "viewer" : "editor"}`)}
      </p>
    </>
  );

  const session = await getSession();

  if (session) {
    const signedInEmail = session.user.email;
    if (signedInEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <>
          {intro}
          <div className="space-y-4 text-sm leading-6 text-slate-300">
            <p>{rich(t("invite.wrongAccount"), { signedIn: strong(signedInEmail), invited: strong(invite.email) })}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </>
      );
    }
    if (await getMembership(session.user.id)) {
      return (
        <>
          {intro}
          <p className="text-sm leading-6 text-amber-200">
            {t("invite.alreadyMember")}{" "}
            <Link href="/" className={linkClass}>
              {t("invite.goToDashboard")}
            </Link>
          </p>
        </>
      );
    }
    return (
      <Messages namespaces={["auth"]}>
        {intro}
        <AcceptInviteButton token={token} householdName={invite.householdName} />
      </Messages>
    );
  }

  if (invite.accountExists) {
    return (
      <>
        {intro}
        <p className="mb-4 text-sm leading-6 text-slate-300">{rich(t("invite.accountExists"), { email: strong(invite.email) })}</p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
          className={buttonClasses({ variant: "primary", size: "md", block: true })}
        >
          {t("invite.signInToAccept")}
        </Link>
      </>
    );
  }

  return (
    <Messages namespaces={["auth"]}>
      {intro}
      <NewAccountInviteForm token={token} email={invite.email} />
    </Messages>
  );
}
