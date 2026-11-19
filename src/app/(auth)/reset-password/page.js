import Link from "next/link";
import ResetPasswordForm from "@/components/Auth/ResetPasswordForm";
import { buttonClasses } from "@/components/ui/Button";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";

// The token is in the URL: don't leak it to other sites through the Referer header.
export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.resetPassword") }), referrer: "no-referrer" };
}

// The emailed link goes to Better Auth first, which checks it and forwards here with
// ?token=... (valid) or ?error=INVALID_TOKEN (expired, used or tampered with).
export default async function ResetPasswordPage({ searchParams }) {
  const { token, error } = await searchParams;
  const t = await getTranslations("auth");

  if (error || typeof token !== "string" || !token) {
    return (
      <>
        <h1 className="text-2xl font-semibold">{t("linkFailed")}</h1>
        <p className="mt-3 mb-6 text-sm leading-6 text-slate-300">{t("reset.invalidBody")}</p>
        <Link href="/forgot-password" className={buttonClasses({ variant: "primary", size: "md", block: true })}>
          {t("getNewLink")}
        </Link>
      </>
    );
  }

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold">{t("reset.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">{t("reset.intro")}</p>
      <ResetPasswordForm token={token} />
    </Messages>
  );
}
