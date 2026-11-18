"use server";

// Server Actions for household members and invitations. Managing members is owner-only
// (requirePermission("members:manage")); accepting an invite is open to whoever holds the link.
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { householdMember, invite, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission, requireUser } from "@/lib/dal";
import { sendInviteEmail, siteUrl } from "@/lib/email";
import { EMAIL_COOLDOWN_MS, EMAIL_PATTERN, field, isUniqueViolation, newPasswordErrors, passwordField, UUID_PATTERN } from "@/lib/forms";
import {
  acceptInviteAsExistingUser,
  acceptInviteAsNewUser,
  hashInviteToken,
  INVITABLE_ROLES,
  INVITE_TTL_DAYS,
  InviteError,
  inviteExpiry,
  newInviteToken,
} from "@/lib/invites";
import { announce } from "@/lib/live";
import { roleChangedMessage } from "@/lib/notification-messages";
import { notify } from "@/lib/notifications";
import { ROLE_LABELS } from "@/lib/permissions";
import { isTooSoon } from "@/lib/throttle";

const MAX_NAME_LENGTH = 100;

// Creates the invite (or refreshes the open one for that email with a new link and expiry)
// and emails it. Returns a message for the form.
async function issueInvite(context, email, role) {
  if (isTooSoon(`invite:${context.householdId}:${email}`, EMAIL_COOLDOWN_MS)) {
    return { error: "An invitation was just sent to this address. Please wait a minute." };
  }

  const token = newInviteToken();
  const values = { tokenHash: hashInviteToken(token), role, expiresAt: inviteExpiry(), invitedByUserId: context.user.id };

  try {
    await db.transaction(async tx => {
      const [open] = await tx
        .select({ id: invite.id })
        .from(invite)
        .where(
          and(
            eq(invite.householdId, context.householdId),
            sql`lower(${invite.email}) = ${email}`,
            isNull(invite.acceptedAt),
            isNull(invite.revokedAt),
          ),
        )
        .for("update");
      // Refreshing replaces the token, so any older link for this address stops working.
      if (open) await tx.update(invite).set(values).where(eq(invite.id, open.id));
      else await tx.insert(invite).values({ ...values, householdId: context.householdId, email });
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "This address was invited at the same moment. Refresh the page." };
    throw error;
  }
  revalidatePath("/members");

  try {
    await sendInviteEmail({
      to: email,
      inviterName: context.user.name,
      householdName: context.householdName,
      roleLabel: ROLE_LABELS[role],
      url: siteUrl(`/invite/${token}`),
      expiresInDays: INVITE_TTL_DAYS,
    });
  } catch (error) {
    console.error("Sending invite email failed", error);
    return { error: `The invitation was saved, but the email to ${email} couldn't be sent. Use "Resend" to try again.` };
  }
  return { success: `Invitation sent to ${email}.` };
}

export async function inviteMemberAction(_previousState, formData) {
  const context = await requirePermission("members:manage");
  const values = { email: field(formData, "email").toLowerCase(), role: field(formData, "role") };

  const errors = {};
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 255) errors.email = "Enter a valid email address.";
  if (!INVITABLE_ROLES.includes(values.role)) errors.role = "Choose Editor or Viewer.";
  if (Object.keys(errors).length) return { errors, values };

  const [alreadyMember] = await db
    .select({ id: householdMember.id })
    .from(householdMember)
    .innerJoin(user, eq(user.id, householdMember.userId))
    .where(and(eq(householdMember.householdId, context.householdId), sql`lower(${user.email}) = ${values.email}`));
  if (alreadyMember) return { values, errors: { email: "This person is already a member of your household." } };

  const result = await issueInvite(context, values.email, values.role);
  // Clear the email after a success; keep what was typed after an error.
  return result.success ? { ...result, values: { email: "", role: values.role } } : { ...result, values };
}

// Loads an open invite of the current household by id (from a hidden form field).
async function findOpenInvite(householdId, inviteId) {
  if (!UUID_PATTERN.test(inviteId)) return null;
  const [row] = await db
    .select({ id: invite.id, email: invite.email, role: invite.role })
    .from(invite)
    .where(and(eq(invite.id, inviteId), eq(invite.householdId, householdId), isNull(invite.acceptedAt), isNull(invite.revokedAt)));
  return row ?? null;
}

export async function resendInviteAction(_previousState, formData) {
  const context = await requirePermission("members:manage");
  const open = await findOpenInvite(context.householdId, field(formData, "inviteId"));
  if (!open) return { error: "This invitation no longer exists." };
  return issueInvite(context, open.email.toLowerCase(), open.role);
}

export async function revokeInviteAction(_previousState, formData) {
  const context = await requirePermission("members:manage");
  const open = await findOpenInvite(context.householdId, field(formData, "inviteId"));
  if (!open) return { error: "This invitation no longer exists." };
  await db.update(invite).set({ revokedAt: new Date() }).where(eq(invite.id, open.id));
  revalidatePath("/members");
  return { success: "Invitation cancelled." };
}

// Member rows are identified by household_member.id; the owner's row can never be changed here.
const nonOwnerMemberOf = (householdId, memberId) =>
  and(eq(householdMember.id, memberId), eq(householdMember.householdId, householdId), ne(householdMember.role, "owner"));

export async function changeMemberRoleAction(_previousState, formData) {
  const context = await requirePermission("members:manage");
  const memberId = field(formData, "memberId");
  const role = field(formData, "role");
  if (!INVITABLE_ROLES.includes(role) || !UUID_PATTERN.test(memberId)) return { error: "Choose Editor or Viewer." };

  const updated = await db
    .update(householdMember)
    .set({ role })
    .where(nonOwnerMemberOf(context.householdId, memberId))
    .returning({ id: householdMember.id, userId: householdMember.userId });
  if (!updated.length) return { error: "This member can't be changed." };
  await announce(context, "members");
  await notify(db, {
    householdId: context.householdId,
    userIds: [updated[0].userId],
    type: "member",
    ...roleChangedMessage({ role, householdName: context.householdName }),
    link: "/members",
  });
  revalidatePath("/members");
  return { success: `Role changed to ${ROLE_LABELS[role]}.` };
}

export async function removeMemberAction(_previousState, formData) {
  const context = await requirePermission("members:manage");
  const memberId = field(formData, "memberId");
  if (!UUID_PATTERN.test(memberId)) return { error: "This member can't be removed." };

  // Their account stays; they just lose access to this household (checked on every request).
  const removed = await db
    .delete(householdMember)
    .where(nonOwnerMemberOf(context.householdId, memberId))
    .returning({ id: householdMember.id });
  if (!removed.length) return { error: "This member can't be removed." };
  await announce(context, "members");
  revalidatePath("/members");
  return { success: "Member removed." };
}

/** Invite link, new person: choose a name and password, join, and get signed in. */
export async function acceptInviteWithNewAccountAction(_previousState, formData) {
  const token = field(formData, "token");
  const values = { name: field(formData, "name") };
  const password = passwordField(formData, "password");

  const errors = newPasswordErrors(password, passwordField(formData, "confirmPassword"));
  if (!values.name) errors.name = "Enter your name.";
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = "That name is too long.";
  if (Object.keys(errors).length) return { errors, values };

  let email;
  try {
    ({ email } = await acceptInviteAsNewUser({ token, name: values.name, password }));
  } catch (error) {
    if (error instanceof InviteError) return { values, error: error.message };
    if (isUniqueViolation(error)) {
      return { values, error: "An account with this email already exists. Sign in to accept the invitation." };
    }
    console.error("Accepting invite failed", error);
    return { values, error: "We couldn't create your account. Please try again." };
  }

  let signedIn = true;
  try {
    await auth.api.signInEmail({ body: { email, password, rememberMe: true }, headers: await headers() });
  } catch (error) {
    // The account exists and they're in the household; they can sign in by hand.
    console.error("Sign-in after accepting invite failed", error);
    signedIn = false;
  }
  redirect(signedIn ? "/" : "/sign-in");
}

/** Invite link, already signed in with the invited email. */
export async function acceptInviteAction(_previousState, formData) {
  const signedInUser = await requireUser();
  try {
    await acceptInviteAsExistingUser({ token: field(formData, "token"), userId: signedInUser.id, email: signedInUser.email });
  } catch (error) {
    if (error instanceof InviteError) return { error: error.message };
    console.error("Accepting invite failed", error);
    return { error: "We couldn't accept the invitation. Please try again." };
  }
  redirect("/");
}
