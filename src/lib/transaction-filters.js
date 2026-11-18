// Transactions page filters ⇄ URL search params. Pure functions (no server or browser APIs),
// so the filtered view can be bookmarked or shared, and the logic is easy to unit-test.
import { parseDate, UUID_PATTERN } from "@/lib/forms";

const SORT_KEYS = ["date", "amount", "title", "category"];
const MAX_QUERY_LENGTH = 100;

const pad = n => String(n).padStart(2, "0");
const iso = date => date.toISOString().slice(0, 10);
const utc = isoDate => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const lastDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Quick date ranges relative to `today` ("YYYY-MM-DD"). Empty from/to = no limit. */
export function datePresets(today) {
  const [year, month] = today.split("-").map(Number);
  const [prevYear, prevMonth] = month === 1 ? [year - 1, 12] : [year, month - 1];
  const ninetyDaysAgo = utc(today);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 89);
  return [
    {
      key: "this-month",
      label: "This month",
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${lastDayOfMonth(year, month)}`,
    },
    {
      key: "last-month",
      label: "Last month",
      from: `${prevYear}-${pad(prevMonth)}-01`,
      to: `${prevYear}-${pad(prevMonth)}-${lastDayOfMonth(prevYear, prevMonth)}`,
    },
    { key: "90-days", label: "Last 90 days", from: iso(ninetyDaysAgo), to: today },
    { key: "this-year", label: "This year", from: `${year}-01-01`, to: `${year}-12-31` },
    { key: "all", label: "All time", from: "", to: "" },
  ];
}

const first = value => (Array.isArray(value) ? value[0] : value);

/**
 * Validated filters from the page's searchParams. Anything invalid is ignored rather than
 * failing the page. With no `from`/`to` in the URL at all, the current month is shown;
 * present-but-empty means "no limit" (that's what the filter form submits for a cleared field).
 */
export function parseTransactionFilters(searchParams, { today }) {
  const get = key => {
    const value = first(searchParams?.[key]);
    return typeof value === "string" ? value.trim() : undefined;
  };
  const thisMonth = datePresets(today)[0];
  const hasRange = get("from") !== undefined || get("to") !== undefined;

  let from = hasRange ? parseDate(get("from")) : thisMonth.from;
  let to = hasRange ? parseDate(get("to")) : thisMonth.to;
  if (from && to && from > to) [from, to] = [to, from];

  const categoryId = get("category") ?? "";
  const paidByUserId = get("member") ?? "";
  const q = (get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const sort = SORT_KEYS.includes(get("sort")) ? get("sort") : "date";
  const defaultDir = sort === "title" || sort === "category" ? "asc" : "desc";
  const dir = get("dir") === "asc" || get("dir") === "desc" ? get("dir") : defaultDir;
  const page = Math.min(10_000, Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1));

  return {
    from: from ?? null,
    to: to ?? null,
    categoryId: UUID_PATTERN.test(categoryId) ? categoryId : "",
    // Better Auth user ids are random strings; only allow the characters they use.
    paidByUserId: /^[A-Za-z0-9_-]{1,64}$/.test(paidByUserId) ? paidByUserId : "",
    q,
    sort,
    dir,
    page,
  };
}

/** "/transactions?..." for the given filters with some values changed. Defaults are left out. */
export function transactionsHref(filters, changes = {}) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  // The date range is always written, so "all time" (empty) stays distinct from "this month" (absent).
  params.set("from", next.from ?? "");
  params.set("to", next.to ?? "");
  if (next.categoryId) params.set("category", next.categoryId);
  if (next.paidByUserId) params.set("member", next.paidByUserId);
  if (next.q) params.set("q", next.q);
  if (next.sort !== "date") params.set("sort", next.sort);
  const defaultDir = next.sort === "title" || next.sort === "category" ? "asc" : "desc";
  if (next.dir !== defaultDir) params.set("dir", next.dir);
  if (next.page > 1) params.set("page", String(next.page));
  return `/transactions?${params}`;
}

/** Link target for a sortable column header: toggles direction if already sorted by it. */
export function sortHref(filters, key) {
  if (filters.sort === key) return transactionsHref(filters, { dir: filters.dir === "asc" ? "desc" : "asc", page: 1 });
  return transactionsHref(filters, { sort: key, dir: key === "title" || key === "category" ? "asc" : "desc", page: 1 });
}
