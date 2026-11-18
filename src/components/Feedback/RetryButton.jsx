"use client";

// Loads the page's server data again (e.g. after another service failed), showing progress.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { buttonClasses } from "@/components/ui/Button";

export default function RetryButton({ children = "Try again" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={buttonClasses({ variant: "secondary", size: "xs" })}
    >
      {pending ? "Trying…" : children}
    </button>
  );
}
