import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/Auth/SignInForm";
import Messages from "@/i18n/MessagesProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/dal";

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("meta.signIn") }) };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (await getSession()) redirect("/");
  const { next, reset } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <Messages namespaces={["auth"]}>
      <h1 className="text-2xl font-semibold text-slate-300">{t("signInPage.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">{t("signInPage.intro")}</p>
      {reset ? (
        <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {t("signInPage.passwordChanged")}
        </p>
      ) : null}
      <SignInForm next={typeof next === "string" ? next : "/"} />
    </Messages>
  );
}
