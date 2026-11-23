// A titled Card: the building block of every page.
import Card from "@/components/ui/Card";

export default function Panel({ title, subtitle, children, className = "", contentClassName = "" }) {
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
