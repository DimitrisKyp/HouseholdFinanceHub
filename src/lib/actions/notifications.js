"use server";

// Server Actions for the notification centre. Everyone in a household (viewers too) can read
// and dismiss their own notifications, and only their own.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/dal";
import { field, UUID_PATTERN } from "@/lib/forms";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

// Links are written by the app, but only ever follow ones inside it.
const isInternalLink = link => typeof link === "string" && link.startsWith("/") && !link.startsWith("//");

/** Marks a notification read and opens what it's about. */
export async function openNotificationAction(formData) {
  const { user, householdId } = await requireHousehold();
  const notificationId = field(formData, "notificationId");
  const found = UUID_PATTERN.test(notificationId) ? await markNotificationRead(user.id, householdId, notificationId) : null;
  // Opening navigates, which makes the badge in the navigation check again.
  revalidatePath("/notifications");
  redirect(found && isInternalLink(found.link) ? found.link : "/notifications");
}

export async function markAllNotificationsReadAction() {
  const { user, householdId } = await requireHousehold();
  await markAllNotificationsRead(user.id, householdId);
  // The badge in the navigation is told by the button (see lib/unread-signal.js).
  revalidatePath("/notifications");
}
