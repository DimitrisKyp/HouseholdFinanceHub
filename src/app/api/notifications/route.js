// The signed-in user's latest notifications, for the pop-up behind the bell on the dashboard.
// Each one in the reader's language, with its time in the household's timezone.
import { dateLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { getMembership, getSession } from "@/lib/dal";
import { renderNotification } from "@/lib/notification-messages";
import { listNotifications } from "@/lib/notifications";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ unread: 0, items: [] }, { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return Response.json({ unread: 0, items: [] }, { headers: NO_STORE });

  const [rows, locale] = await Promise.all([listNotifications(session.user.id, membership.householdId), getLocale()]);

  // The year only when it isn't this year.
  const intlLocale = dateLocale(locale);
  const { timezone } = membership;
  const yearOf = date => new Intl.DateTimeFormat(intlLocale, { year: "numeric", timeZone: timezone }).format(date);
  const thisYear = yearOf(new Date());
  const whenLabel = date =>
    new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "short",
      ...(yearOf(date) === thisYear ? {} : { year: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);

  const items = rows.map(({ id, type, title, body, data, readAt, createdAt }) => ({
    id,
    type,
    readAt,
    ...renderNotification({ data, title, body }, locale),
    whenLabel: whenLabel(createdAt),
  }));
  return Response.json({ unread: items.filter(item => !item.readAt).length, items }, { headers: NO_STORE });
}
