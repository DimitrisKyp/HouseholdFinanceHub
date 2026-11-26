import type { ReactNode } from "react";

// A short label in a tone. The text carries the meaning; the colour only supports it.
const TONES = {
  neutral: "border-line bg-white/10 text-slate-200",
  info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-200",
};

/** The colour names a Badge accepts: derived from TONES, so adding a tone there adds it here. */
export type BadgeTone = keyof typeof TONES;

type BadgeProps = {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
};

export default function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
