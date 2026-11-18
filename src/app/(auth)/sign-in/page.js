import { redirect } from "next/navigation";
import SignInForm from "@/components/Auth/SignInForm";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Sign in · Household Finance Hub" };

export default async function SignInPage({ searchParams }) {
  if (await getSession()) redirect("/");
  const { next, reset } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-300">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">Sign in to your household.</p>
      {reset ? (
        <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Your password has been changed. Sign in with your new password.
        </p>
      ) : null}
      <SignInForm next={typeof next === "string" ? next : "/"} />
    </>
  );
}
