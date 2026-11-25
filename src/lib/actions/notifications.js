"use server";

// Server Actions for the notifications pop-up. Everyone in a household (viewers too) can read
// and dismiss their own notifications, and only their own.
import { requireHousehold } from "@/lib/dal";
import { field, UUID_PATTERN } from "@/lib/forms";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

// Links are written by the app, but only ever follow ones inside it.
const isInternalLink = link => typeof link === "string" && link.startsWith("/") && !link.startsWith("//");

/** Marks a notification read. Returns { link }: where it's about, or null when it isn't about a page. */
export async function openNotificationAction(formData) {
  const { user, householdId } = await requireHousehold();
  const notificationId = field(formData, "notificationId");
  const found = UUID_PATTERN.test(notificationId) ? await markNotificationRead(user.id, householdId, notificationId) : null;
  return { link: found && isInternalLink(found.link) ? found.link : null };
}

export async function markAllNotificationsReadAction() {
  const { user, householdId } = await requireHousehold();
  await markAllNotificationsRead(user.id, householdId);
}
