// Buttons in the app's variants. buttonClasses() styles a <Link> or <a> the same way.
const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  secondary: "border border-line text-slate-200 hover:border-cyan-400/40 hover:text-white",
};
const SIZES = {
  md: "rounded-control px-4 py-3",
  sm: "rounded-control px-4 py-2.5 text-sm",
  xs: "rounded-lg px-2.5 py-1.5 text-xs",
  pill: "rounded-full px-4 py-2 text-sm",
};

export function buttonClasses({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  return [
    "inline-flex items-center justify-center text-center font-medium transition disabled:cursor-wait disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    block ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button({ variant, size, block, className, type = "button", ...props }) {
  return <button type={type} className={buttonClasses({ variant, size, block, className })} {...props} />;
}

/** A form's main button: disabled with a "…ing" label while the form is being sent. */
export function SubmitButton({ pending, pendingText, children, variant, size, block = true, className }) {
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} block={block} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}
