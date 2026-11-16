import { redirect } from "next/navigation";
import SignUpForm from "@/components/Auth/SignUpForm";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Create account · Household Finance Hub" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/");

  return (
    <>
      <h1 className="text-2xl font-semibold">Create your household</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">
        Set up your account. You’ll be the household owner, with full control over members and settings.
      </p>
      <SignUpForm />
    </>
  );
}
