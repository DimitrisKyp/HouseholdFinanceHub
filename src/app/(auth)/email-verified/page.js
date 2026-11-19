import Link from "next/link";
import { redirect } from "next/navigation";
import ResendVerificationForm from "@/components/Auth/ResendVerificationForm";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/dal";
import { safeRedirectPath } from "@/lib/redirects";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.confirmEmail") }) };
}

// Better Auth sends the confirmation link here after checking it: with ?error=... if the link
// was bad, otherwise with the user already logged in.
const KNOWN_ERRORS = ["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND", "INVALID_USER"];

export default async function EmailVerifiedPage({ searchParams }) {
  const { error, next } = await searchParams;

  if (!error) {
    // Confirmed and logged in: carry on (new users without a household go to onboarding).
    if (await getSession()) redirect(safeRedirectPath(next));
    redirect("/sign-in");
  }

  const t = await getTranslations("auth");
  const message = t(`emailVerified.errors.${KNOWN_ERRORS.includes(error) ? error : "other"}`);

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold">{t("linkFailed")}</h1>
      <p className="mt-3 mb-6 text-sm leading-6 text-slate-300">
        {message} {t("emailVerified.sendNew")}
      </p>
      <ResendVerificationForm />
      <p className="mt-6 text-center text-sm text-slate-400">
        {t("alreadyConfirmed")}{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          {t("signIn")}
        </Link>
      </p>
    </Messages>
  );
}
