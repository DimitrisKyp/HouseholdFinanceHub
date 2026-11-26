// Form fields and form messages, wired up for screen readers (labels, aria-invalid, aria-describedby).
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { FormState } from "@/lib/forms";

/** Every native <input> prop, plus a label and the messages shown under it. `id` is required: it links them. */
export type TextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "id"> & {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  trailing?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * Labelled input with an optional hint and an inline error message. `trailing` is a small control
 * shown inside the input's right edge (e.g. PasswordField's show/hide button).
 */
export default function TextField({ id, label, error, hint, trailing, inputRef, ...inputProps }: TextFieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  const input = (
    <input
      ref={inputRef}
      id={id}
      name={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={`rounded-control w-full border bg-slate-950/60 px-4 py-3 text-white transition outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
        error ? "border-rose-400/70" : "border-line"
      } ${trailing ? "pr-12" : ""}`}
      {...inputProps}
    />
  );

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-slate-300">
        {label}
      </label>
      {trailing ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>
        </div>
      ) : (
        input
      )}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type MessageProps = { message?: string | null };

export function FormError({ message }: MessageProps) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: MessageProps) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
      {message}
    </p>
  );
}

type SelectFieldProps = Omit<ComponentPropsWithoutRef<"select">, "id"> & {
  id: string;
  label: ReactNode;
  error?: string;
};

/** Labelled <select> with an inline error message, styled like TextField. */
export function SelectField({ id, label, error, children, ...selectProps }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-slate-300">
        {label}
      </label>
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`rounded-control w-full border bg-slate-950/60 px-4 py-3 text-white transition outline-none focus:border-cyan-400 ${
          error ? "border-rose-400/70" : "border-line"
        }`}
        {...selectProps}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One-line result message under a small inline form (role change, delete, save).
 * Takes any action state: `Pick` keeps only the two fields it reads, so every FormState fits.
 */
export function InlineMessage({ state }: { state: Pick<FormState, "error" | "success"> | null | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="mt-2 text-xs text-rose-300">
        {state.error}
      </p>
    );
  if (state?.success)
    return (
      <p role="status" className="mt-2 text-xs text-emerald-300">
        {state.success}
      </p>
    );
  return null;
}
