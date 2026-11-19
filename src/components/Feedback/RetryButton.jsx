"use client";

// Loads the page's server data again (e.g. after another service failed), showing progress.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";

export default function RetryButton({ children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("errors");
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={buttonClasses({ variant: "secondary", size: "xs" })}
    >
      {pending ? t("trying") : (children ?? t("tryAgain"))}
    </button>
  );
}
