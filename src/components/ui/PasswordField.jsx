"use client";

// Password input with an eye button that shows or hides what was typed.
import { useEffect, useRef, useState } from "react";
import TextField from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";

const EYE =
  "M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5c4.64 0 8.57 3 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.64 19.5 12 19.5c-4.64 0-8.57-3-9.96-7.18Z";
const EYE_SLASH =
  "M3.98 8.22A10.48 10.48 0 0 0 1.93 12C3.23 16.34 7.24 19.5 12 19.5c.99 0 1.95-.14 2.86-.4M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.76 0 8.77 3.16 10.07 7.5a10.52 10.52 0 0 1-4.29 5.77M6.23 6.23 3 3m3.23 3.23 3.65 3.65m7.89 7.89L21 21m-3.23-3.23-3.65-3.65m0 0a3 3 0 1 0-4.24-4.24m4.24 4.24L9.88 9.88";

/** Same props as TextField (type is managed here). */
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const t = useTranslations("common");

  // Hide it again when the form is sent, so browsers still offer to save the password and it
  // isn't left on screen afterwards.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <TextField
      {...props}
      inputRef={inputRef}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          aria-label={t("showPassword")}
          aria-pressed={visible}
          aria-controls={props.id}
          title={visible ? t("hidePassword") : t("showPassword")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
          >
            {visible ? (
              <path strokeLinecap="round" strokeLinejoin="round" d={EYE_SLASH} />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d={EYE} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </>
            )}
          </svg>
        </button>
      }
    />
  );
}
