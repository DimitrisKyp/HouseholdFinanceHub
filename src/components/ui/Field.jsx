// Form fields and form messages, wired up for screen readers (labels, aria-invalid, aria-describedby).

/** Labelled input with an optional hint and an inline error message. */
export default function TextField({ id, label, error, hint, ...inputProps }) {
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
        className={`rounded-control w-full border bg-slate-950/60 px-4 py-3 text-white transition outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
          error ? "border-rose-400/70" : "border-line"
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

export function FormSuccess({ message }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
      {message}
    </p>
  );
}

/** Labelled <select> with an inline error message, styled like TextField. */
export function SelectField({ id, label, error, children, ...selectProps }) {
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

/** One-line result message under a small inline form (role change, delete, save). */
export function InlineMessage({ state }) {
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
