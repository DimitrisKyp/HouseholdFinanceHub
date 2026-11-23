import { redirect } from "next/navigation";
import SignUpForm from "@/components/Auth/SignUpForm";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/dal";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.signUp") }) };
}

export default async function SignUpPage() {
  if (await getSession()) redirect("/");
  const t = await getTranslations("auth");

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold">{t("signUpPage.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">{t("signUpPage.intro")}</p>
      <SignUpForm />
    </Messages>
  );
}
