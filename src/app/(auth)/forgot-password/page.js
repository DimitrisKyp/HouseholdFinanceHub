import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.forgotPassword") }) };
}

export default async function ForgotPasswordPage({ searchParams }) {
  const { email } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold text-slate-300">{t("forgot.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">{t("forgot.intro")}</p>
      <ForgotPasswordForm email={typeof email === "string" ? email : ""} />
    </Messages>
  );
}
