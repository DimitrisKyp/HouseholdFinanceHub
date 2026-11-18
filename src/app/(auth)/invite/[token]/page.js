import Link from "next/link";
import { AcceptInviteButton, NewAccountInviteForm } from "@/components/Invite/AcceptInviteForms";
import { signOutAction } from "@/lib/actions/auth";
import { getMembership, getSession } from "@/lib/dal";
import { getInviteByToken } from "@/lib/invites";
import { ROLE_LABELS } from "@/lib/permissions";

// The token is in the URL: don't leak it to other sites through the Referer header.
export const metadata = { title: "Invitation · Household Finance Hub", referrer: "no-referrer" };

const ROLE_SUMMARY = {
  editor: "You'll be able to add and edit expenses, budgets and goals.",
  viewer: "You'll be able to see the household's budgets, expenses and goals.",
};

function Notice({ title, children }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-3 space-y-4 text-sm leading-6 text-slate-300">{children}</div>
    </>
  );
}

const linkClass = "text-cyan-300 hover:text-cyan-200";

export default async function InvitePage({ params }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <Notice title="Invitation not found">
        <p>This link isn’t valid. Make sure you copied the whole link from the email.</p>
      </Notice>
    );
  }
  if (invite.status === "accepted") {
    return (
      <Notice title="Already accepted">
        <p>
          This invitation has already been used.{" "}
          <Link href="/sign-in" className={linkClass}>
            Sign in
          </Link>{" "}
          to open the household.
        </p>
      </Notice>
    );
  }
  if (invite.status === "revoked" || invite.status === "expired") {
    return (
      <Notice title={invite.status === "expired" ? "Invitation expired" : "Invitation cancelled"}>
        <p>
          {invite.status === "expired" ? "This invitation has expired." : "This invitation was cancelled."} Ask {invite.inviterName} to send
          you a new one.
        </p>
      </Notice>
    );
  }

  const intro = (
    <>
      <h1 className="text-2xl font-semibold text-slate-300">Join {invite.householdName}</h1>
      <p className="mt-1 mb-6 text-sm leading-6 text-slate-400">
        {invite.inviterName} invited you as {invite.role === "viewer" ? "a" : "an"}{" "}
        <span className="font-medium text-slate-200">{ROLE_LABELS[invite.role]}</span>. {ROLE_SUMMARY[invite.role]}
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
            <p>
              You’re signed in as <span className="font-medium text-white">{signedInEmail}</span>, but this invitation is for{" "}
              <span className="font-medium text-white">{invite.email}</span>. Sign out, then open the link from the email again.
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Sign out
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
            Your account already belongs to a household. Being in more than one household isn’t supported yet.{" "}
            <Link href="/" className={linkClass}>
              Go to your dashboard
            </Link>
          </p>
        </>
      );
    }
    return (
      <>
        {intro}
        <AcceptInviteButton token={token} householdName={invite.householdName} />
      </>
    );
  }

  if (invite.accountExists) {
    return (
      <>
        {intro}
        <p className="mb-4 text-sm leading-6 text-slate-300">
          There’s already an account for <span className="font-medium text-white">{invite.email}</span>. Sign in to accept.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="block w-full rounded-xl bg-cyan-500 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          Sign in to accept
        </Link>
      </>
    );
  }

  return (
    <>
      {intro}
      <NewAccountInviteForm token={token} email={invite.email} />
    </>
  );
}
