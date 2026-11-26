"use client";

// Ranked horizontal bars: spending per category, largest first, one hue. Every bar carries its
// amount and share at the tip, so no tooltip is needed; the list itself is the table view.
import { useTranslations } from "@/i18n/client";

const BAR_COLOR = "var(--chart-positive)"; // series slot 1, from the theme tokens in globals.css

/** One bar: a category (or the folded "other" row) from topCategories, with its formatted total. */
export type CategoryBarRow = { id: string; name: string; total: number; share: number; totalLabel: string };

export default function CategoryBars({ rows }: { rows: CategoryBarRow[] }) {
  const t = useTranslations("insights");
  if (!rows.length) return <p className="text-sm text-slate-500">{t("categories.empty")}</p>;
  const max = Math.max(...rows.map(row => row.total));

  return (
    <ol className="space-y-3" aria-label={t("categories.listLabel")}>
      {rows.map(row => (
        <li key={row.id} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-slate-300" title={row.name}>
            {row.name}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            {/* 12px bar: square at the baseline (left), 4px rounded data end (right). */}
            <span
              aria-hidden="true"
              className="block h-3 shrink-0 rounded-r"
              style={{ width: `calc(${(row.total / max) * 100}% - 7rem)`, minWidth: 2, backgroundColor: BAR_COLOR }}
            />
            <span className="shrink-0 whitespace-nowrap text-slate-200 tabular-nums">
              {row.totalLabel} <span className="text-slate-500">· {row.share}%</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
