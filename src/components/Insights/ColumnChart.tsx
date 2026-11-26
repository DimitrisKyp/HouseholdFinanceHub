"use client";

// Column chart in plain SVG, sized to its container. One series, optionally diverging around zero
// (positive and negative columns in two colours), with an optional labelled reference line.
// Each column's whole band is a hover/focus target showing a tooltip; a table view sits below.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { numberLocale } from "@/i18n/config";
import { useLocale, useTranslations } from "@/i18n/client";
import { formatMoney } from "@/lib/format";
import { niceTicks } from "@/lib/insights";

// Chart colours come from the theme tokens in globals.css (--chart-*), validated with the dataviz
// palette checker against the panel surface in both themes. Applied through style, as SVG
// presentation attributes can't read CSS variables.
const COLORS = {
  positive: "var(--chart-positive)", // series slot 1 (blue)
  negative: "var(--chart-negative)", // diverging warm pole (red)
  reference: "var(--chart-reference)", // secondary ink
  grid: "var(--chart-grid)",
  baseline: "var(--chart-baseline)",
};
/** One column: `label` on the axis (e.g. "Nov"), `fullLabel` in the tooltip and table ("November 2026"). */
export type ColumnPoint = {
  key: string;
  label: string;
  fullLabel: string;
  value: number;
  /** Extra context, e.g. "month in progress". */
  note?: string | null;
};

export type ColumnChartProps = {
  /** The chart's accessible name. */
  title: string;
  data: ColumnPoint[];
  currency: string;
  /** Colour negative columns differently (for values that go below zero). */
  diverging?: boolean;
  /** A labelled horizontal line, e.g. monthly income. */
  reference?: { value: number; label: string } | null;
  /** Keys of the columns whose value is printed on the cap (label selectively). */
  labelKeys?: string[];
  /** Heading of the value column in the table view. */
  valueHeading: ReactNode;
};

const HEIGHT = 240;
const MARGIN = { top: 24, right: 16, bottom: 28, left: 56 };
const MAX_BAR = 24;
const RADIUS = 4;

/** Path for a column with a rounded data end and a square end at the baseline. */
function columnPath(x: number, width: number, y0: number, y1: number) {
  const up = y1 < y0; // positive value: data end is above the baseline
  const height = Math.abs(y1 - y0);
  const r = Math.min(RADIUS, height, width / 2);
  if (height === 0) return "";
  if (up) {
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + width - r} Q${x + width},${y1} ${x + width},${y1 + r} V${y0} Z`;
  }
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + width - r} Q${x + width},${y1} ${x + width},${y1 - r} V${y0} Z`;
}

/** A ref for an element and its current width in pixels (0 until measured). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  // `as const`: a tuple [ref, number], not an array whose items could be either.
  return [ref, width] as const;
}

const compactTick = (value: number, currency: string, locale: string) =>
  Math.abs(value) >= 10_000
    ? new Intl.NumberFormat(numberLocale(locale), { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(
        value,
      )
    : formatMoney(value, currency, locale);

export default function ColumnChart({
  title,
  data,
  currency,
  diverging = false,
  reference = null,
  labelKeys = [],
  valueHeading,
}: ColumnChartProps) {
  const [containerRef, width] = useWidth();
  // Index of the column being hovered or focused.
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const t = useTranslations("insights");
  const locale = useLocale();

  const values = data.map(item => item.value);
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, reference?.value ?? 0, 0));
  const min = ticks[0];
  const max = ticks[ticks.length - 1];

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const y = (value: number) => MARGIN.top + ((max - value) / (max - min || 1)) * plotHeight;
  const band = data.length ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR, Math.max(4, band * 0.6));
  const money = (value: number) => formatMoney(value, currency, locale);
  const activeItem = active === null ? null : data[active];

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }} onPointerLeave={() => setActive(null)}>
        {width > 0 ? (
          <svg width={width} height={HEIGHT} role="group" aria-label={title} className="block overflow-visible">
            {/* Gridlines and y ticks: solid hairlines, recessive. */}
            {ticks.map(tick => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  style={{ stroke: tick === 0 ? COLORS.baseline : COLORS.grid }}
                />
                <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                  {compactTick(tick, currency, locale)}
                </text>
              </g>
            ))}

            {data.map((item, index) => {
              const x = MARGIN.left + index * band + (band - barWidth) / 2;
              const negative = item.value < 0;
              const color = diverging && negative ? COLORS.negative : COLORS.positive;
              const isActive = active === index;
              return (
                <g key={item.key}>
                  <path
                    d={columnPath(x, barWidth, y(0), y(item.value))}
                    opacity={active === null || isActive ? 1 : 0.55}
                    style={{ fill: color, filter: isActive ? "brightness(1.15)" : undefined, transition: "opacity 120ms" }}
                  />
                  {labelKeys.includes(item.key) && item.value !== 0 ? (
                    <text
                      x={x + barWidth / 2}
                      y={negative ? y(item.value) + 14 : y(item.value) - 6}
                      textAnchor="middle"
                      className="fill-slate-200 text-[11px] font-medium"
                    >
                      {money(item.value)}
                    </text>
                  ) : null}
                  <text
                    x={x + barWidth / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className={`text-[11px] ${isActive ? "fill-white" : "fill-slate-400"}`}
                  >
                    {item.label}
                  </text>
                  {/* Hit target: the whole band and plot height, bigger than the mark. */}
                  <rect
                    x={MARGIN.left + index * band}
                    y={MARGIN.top}
                    width={band}
                    height={plotHeight}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.fullLabel}: ${money(item.value)}${item.note ? `, ${item.note}` : ""}`}
                    aria-describedby={isActive ? tooltipId : undefined}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="cursor-default outline-none focus-visible:stroke-cyan-300"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {reference ? (
              <g aria-hidden="true">
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(reference.value)}
                  y2={y(reference.value)}
                  style={{ stroke: COLORS.reference }}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <text x={width - MARGIN.right} y={y(reference.value) - 6} textAnchor="end" className="fill-slate-300 text-[11px]">
                  {reference.label}
                </text>
              </g>
            ) : null}
          </svg>
        ) : null}

        {activeItem && active !== null ? (
          <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
            style={{
              left: Math.min(Math.max(MARGIN.left + active * band + band / 2, 70), width - 70),
              top: Math.max(0, Math.min(y(activeItem.value), y(0)) - 58),
            }}
          >
            <p className="text-sm font-semibold text-white">{money(activeItem.value)}</p>
            <p className="text-slate-400">{activeItem.fullLabel}</p>
            {activeItem.note ? <p className="text-slate-400">{activeItem.note}</p> : null}
          </div>
        ) : null}
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-200">{t("chart.showTable")}</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead className="text-slate-400">
            <tr>
              <th scope="col" className="py-1 pr-4 font-medium">
                {t("chart.month")}
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {valueHeading}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 tabular-nums">
            {data.map(item => (
              <tr key={item.key}>
                <td className="py-1 pr-4 text-slate-300">
                  {item.fullLabel}
                  {item.note ? <span className="text-slate-500"> ({item.note})</span> : null}
                </td>
                <td className="py-1 text-right text-white">{money(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
