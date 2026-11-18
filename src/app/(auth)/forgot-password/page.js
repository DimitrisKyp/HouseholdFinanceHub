import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password · Household Finance Hub" };

export default async function ForgotPasswordPage({ searchParams }) {
  const { email } = await searchParams;

  return (
    <>
      <h1 className="text-2xl text-slate-300 font-semibold">Forgot your password?</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">Enter your email and we’ll send you a link to choose a new one.</p>
      <ForgotPasswordForm email={typeof email === "string" ? email : ""} />
    </>
  );
}
