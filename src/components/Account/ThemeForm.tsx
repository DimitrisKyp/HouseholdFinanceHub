"use client";

// Theme choice. Applies at once in this browser, then is saved to the account (and a cookie).
import { useActionState, useRef } from "react";
import { InlineMessage } from "@/components/ui/Field";
import type { Theme } from "@/db/schema";
import { useTranslations } from "@/i18n/client";
import { updateThemeAction } from "@/lib/actions/account";

type ThemeFormProps = {
  theme: Theme;
  options: { value: Theme; label: string }[];
};

export default function ThemeForm({ theme, options }: ThemeFormProps) {
  const [state, formAction, pending] = useActionState(updateThemeAction, { theme });
  const form = useRef<HTMLFormElement>(null);
  const t = useTranslations("account");

  return (
    <form ref={form} action={formAction}>
      <fieldset disabled={pending}>
        <legend className="mb-2 text-sm text-slate-300">{t("appearance.theme")}</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(option => (
            <label
              key={option.value}
              className="rounded-control border-line flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-sm text-slate-200 transition has-checked:border-cyan-400/60 has-checked:bg-cyan-400/10 has-checked:text-white"
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                defaultChecked={option.value === theme}
                onChange={() => {
                  document.documentElement.dataset.theme = option.value;
                  form.current?.requestSubmit();
                }}
                className="accent-cyan-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <InlineMessage state={state} />
    </form>
  );
}
