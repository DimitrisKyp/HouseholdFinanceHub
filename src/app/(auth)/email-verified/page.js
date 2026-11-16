import Link from "next/link";
import { redirect } from "next/navigation";
import ResendVerificationForm from "@/components/Auth/ResendVerificationForm";
import { getSession } from "@/lib/dal";
import { safeRedirectPath } from "@/lib/redirects";

export const metadata = { title: "Confirm email · Household Finance Hub" };

// Better Auth sends the confirmation link here after checking it: with ?error=... if the link
// was bad, otherwise with the user already logged in.
const ERROR_MESSAGES = {
  TOKEN_EXPIRED: "This confirmation link has expired.",
  INVALID_TOKEN: "This confirmation link isn’t valid. It may have been copied incompletely.",
  USER_NOT_FOUND: "We couldn’t find the account for this link.",
  INVALID_USER: "This link belongs to a different account than the one you’re signed in to.",
};

export default async function EmailVerifiedPage({ searchParams }) {
  const { error, next } = await searchParams;

  if (!error) {
    // Confirmed and logged in: carry on (new users without a household go to onboarding).
    if (await getSession()) redirect(safeRedirectPath(next));
    redirect("/sign-in");
  }

  const message = ERROR_MESSAGES[error] ?? "We couldn’t confirm your email with this link.";

  return (
    <>
      <h1 className="text-2xl font-semibold">Link didn’t work</h1>
      <p className="mt-3 mb-6 text-sm leading-6 text-slate-300">{message} Enter your email and we’ll send you a new one.</p>
      <ResendVerificationForm />
      <p className="mt-6 text-center text-sm text-slate-400">
        Already confirmed?{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </p>
    </>
  );
}
