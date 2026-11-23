"use client";

// Language choice. Saved to the account (and a cookie); the page then re-renders in the new language.
import { useActionState, useRef } from "react";
import { InlineMessage } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { updateLanguageAction } from "@/lib/actions/account";

export default function LanguageForm({ locale, options }) {
  const [state, formAction, pending] = useActionState(updateLanguageAction, { locale });
  const form = useRef(null);
  const t = useTranslations("account");

  return (
    <form ref={form} action={formAction}>
      <fieldset disabled={pending}>
        <legend className="mb-2 text-sm text-slate-300">{t("appearance.language")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map(option => (
            <label
              key={option.value}
              className="rounded-control border-line flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-sm text-slate-200 transition has-checked:border-cyan-400/60 has-checked:bg-cyan-400/10 has-checked:text-white"
            >
              <input
                type="radio"
                name="locale"
                value={option.value}
                defaultChecked={option.value === locale}
                onChange={() => form.current.requestSubmit()}
                className="accent-cyan-500"
              />
              {/* Each language is named in itself; lang lets screen readers pronounce it right. */}
              <span lang={option.value}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <InlineMessage state={state} />
    </form>
  );
}
