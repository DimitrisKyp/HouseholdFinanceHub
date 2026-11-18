"use client";

// Theme choice. Applies at once in this browser, then is saved to the account (and a cookie).
import { useActionState, useRef } from "react";
import { InlineMessage } from "@/components/ui/Field";
import { updateThemeAction } from "@/lib/actions/account";

export default function ThemeForm({ theme, options }) {
  const [state, formAction, pending] = useActionState(updateThemeAction, { theme });
  const form = useRef(null);

  return (
    <form ref={form} action={formAction}>
      <fieldset disabled={pending}>
        <legend className="mb-2 text-sm text-slate-300">Theme</legend>
        <div className="grid gap-2 sm:grid-cols-3">
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
                  form.current.requestSubmit();
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
