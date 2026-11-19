import Link from "next/link";
import ResendVerificationForm from "@/components/Auth/ResendVerificationForm";
import { rich } from "@/components/Auth/rich";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.checkEmail") }) };
}

export default async function CheckEmailPage({ searchParams }) {
  const { email: rawEmail, reason } = await searchParams;
  const email = typeof rawEmail === "string" && rawEmail.length <= 254 ? rawEmail : "";
  const fromSignIn = reason === "sign-in";
  const t = await getTranslations("auth");
  const body = `checkEmail.${fromSignIn ? "bodySignIn" : "body"}${email ? "" : "NoEmail"}`;

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold text-slate-300">{fromSignIn ? t("checkEmail.titleSignIn") : t("checkEmail.title")}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {rich(t(body), { email: <span className="font-medium text-white">{email}</span> })}
      </p>
      <p className="mt-3 mb-6 text-sm leading-6 text-slate-400">{t("checkEmail.spam")}</p>
      <ResendVerificationForm email={email} />
      <p className="mt-6 text-center text-sm text-slate-400">
        {t("alreadyConfirmed")}{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          {t("signIn")}
        </Link>
      </p>
    </Messages>
  );
}
