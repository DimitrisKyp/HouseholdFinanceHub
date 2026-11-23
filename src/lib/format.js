// Formatting and calendar helpers shared by server and client code.
// Dates are handled as "YYYY-MM-DD" strings in the household's timezone, which is also how
// Postgres `date` columns are read back, so "today" means today where the household lives.
// `locale` is the UI language ("en", "el"); it decides separators, month names and word order.
import { dateLocale, DEFAULT_LOCALE, numberLocale } from "@/i18n/config";

const moneyFormatters = new Map();

/** "€1,250" or "€12.50" in the household currency ("1.250 €", "12,50 €" in Greek). */
export function formatMoney(amount, currency = "EUR", locale = DEFAULT_LOCALE) {
  const value = Number(amount) || 0;
  const hasCents = Math.round(value * 100) % 100 !== 0;
  const key = `${locale}:${currency}:${hasCents}`;
  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(
      key,
      new Intl.NumberFormat(numberLocale(locale), {
        style: "currency",
        currency,
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2,
      }),
    );
  }
  return moneyFormatters.get(key).format(value);
}

/** Today's date as "YYYY-MM-DD" in the given timezone. */
export function todayIn(timezone) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** First day of this month and first day of next month ("YYYY-MM-DD"), in the given timezone. */
export function currentMonthRange(timezone) {
  const [year, month] = todayIn(timezone).split("-").map(Number);
  const pad = n => String(n).padStart(2, "0");
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  return { start: `${year}-${pad(month)}-01`, end: next };
}

/** "18 Nov 2026" ("18 Νοε 2026") for a "YYYY-MM-DD" date. */
export function formatDay(isoDate, locale = DEFAULT_LOCALE) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** "November 2026" ("Νοέμβριος 2026") for a "YYYY-MM-DD" date. */
export function formatMonth(isoDate, locale = DEFAULT_LOCALE) {
  const [year, month] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}
