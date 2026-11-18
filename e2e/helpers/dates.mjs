// Calendar helpers for expectations. The app works out "today" in the household's timezone
// on the server, so the tests do the same instead of assuming a fixed date.
export const HOUSEHOLD_TIMEZONE = "Europe/Athens"; // the household table's default

const pad = n => String(n).padStart(2, "0");

/** Today as "YYYY-MM-DD" in the household timezone. */
export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: HOUSEHOLD_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** [year, month, day] numbers of a "YYYY-MM-DD" date. */
export const parts = isoDate => isoDate.split("-").map(Number);

/** The first day of the month `delta` months away from `isoDate`'s month. */
export function monthStart(isoDate, delta = 0) {
  const [year, month] = parts(isoDate);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
}

/** The same month as `monthIso` on another day: dayOf("2026-11-01", 18) → "2026-11-18". */
export const dayOf = (monthIso, day) => `${monthIso.slice(0, 8)}${pad(day)}`;

const utcDate = isoDate => {
  const [year, month, day] = parts(isoDate);
  return new Date(Date.UTC(year, month - 1, day));
};

/** "18 Nov 2026", as the app shows dates. */
export const formatDay = isoDate =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(utcDate(isoDate));

/** "November 2026". */
export const formatMonth = isoDate =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(utcDate(isoDate));

/** "Nov 26" (axis label of the first column in a chart). */
export const shortMonthWithYear = isoDate =>
  `${new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(utcDate(isoDate))} ${isoDate.slice(2, 4)}`;

/**
 * A date exactly `months` whole months from today, as the app counts them for a goal plan.
 * Today's day of the month when possible; past the 28th, the 28th of the following month
 * (still `months` whole months away, without landing on a day some months don't have).
 */
export function dateMonthsAhead(months) {
  const day = parts(today())[2];
  return day <= 28 ? dayOf(monthStart(today(), months), day) : dayOf(monthStart(today(), months + 1), 28);
}
