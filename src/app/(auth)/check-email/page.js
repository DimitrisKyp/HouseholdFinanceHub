import Link from "next/link";
import ResendVerificationForm from "@/components/Auth/ResendVerificationForm";

export const metadata = { title: "Check your email · Household Finance Hub" };

export default async function CheckEmailPage({ searchParams }) {
  const { email: rawEmail, reason } = await searchParams;
  const email = typeof rawEmail === "string" && rawEmail.length <= 254 ? rawEmail : "";
  const fromSignIn = reason === "sign-in";

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-300">{fromSignIn ? "Confirm your email first" : "Check your email"}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {fromSignIn ? "Your account isn’t confirmed yet. We’ve sent a new confirmation link" : "We’ve sent a confirmation link"}
        {email ? (
          <>
            {" "}
            to <span className="font-medium text-white">{email}</span>
          </>
        ) : null}
        . Open it to finish setting up your account. The link works for 24 hours.
      </p>
      <p className="mt-3 mb-6 text-sm leading-6 text-slate-400">Can’t find it? Check your spam folder, or send a new one.</p>
      <ResendVerificationForm email={email} />
      <p className="mt-6 text-center text-sm text-slate-400">
        Already confirmed?{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </p>
    </>
  );
}
