import { redirect } from "next/navigation";
import SignInForm from "@/components/Auth/SignInForm";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Sign in · Household Finance Hub" };

export default async function SignInPage({ searchParams }) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">Sign in to your household.</p>
      <SignInForm next={typeof next === "string" ? next : "/"} />
    </>
  );
}
