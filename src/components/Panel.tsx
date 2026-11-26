// A titled Card: the building block of every page.
import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

type PanelProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function Panel({ title, subtitle, children, className = "", contentClassName = "" }: PanelProps) {
  return (
    <Card className={className}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </Card>
  );
}
