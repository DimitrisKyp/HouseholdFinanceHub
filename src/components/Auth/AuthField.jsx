// Labelled input with an inline error message, wired up for screen readers.
export default function AuthField({ id, label, error, hint, ...inputProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border bg-slate-950/60 px-4 py-3 text-white transition outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
          error ? "border-rose-400/70" : "border-white/10"
        }`}
        {...inputProps}
      />
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

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children, pendingText }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
