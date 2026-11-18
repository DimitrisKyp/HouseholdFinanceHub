// The signed-in user's unread notification count, for the badge in the navigation.
// The navigation stays mounted between pages, so it asks again after each navigation and now and then.
import { getMembership, getSession } from "@/lib/dal";
import { unreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ unread: 0 }, { status: 401 });
  const membership = await getMembership(session.user.id);
  const unread = membership ? await unreadNotificationCount(session.user.id, membership.householdId) : 0;
  return Response.json({ unread }, { headers: { "Cache-Control": "no-store" } });
}
