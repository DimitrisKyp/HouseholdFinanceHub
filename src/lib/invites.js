// Household invitations: creating, looking up and accepting them.
// Only a SHA-256 hash of each invite token is stored; the raw token exists only in the email link,
// so someone reading the database can't use it to join.
import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { account, household, householdMember, invite, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { memberJoinedMessage, welcomeMessage } from "@/lib/notification-messages";
import { memberIds, notify } from "@/lib/notifications";

export const INVITE_TTL_DAYS = 7;
export const INVITABLE_ROLES = ["editor", "viewer"];

export const newInviteToken = () => randomBytes(32).toString("base64url");
export const hashInviteToken = token => createHash("sha256").update(token).digest("hex");
export const inviteExpiry = () => new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

/** Thrown for expected problems; `message` is safe to show to the user. */
export class InviteError extends Error {}

/** Members of a household, owner first, then by join date. */
export async function listMembers(householdId) {
  return db
    .select({
      memberId: householdMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: householdMember.role,
      joinedAt: householdMember.joinedAt,
    })
    .from(householdMember)
    .innerJoin(user, eq(user.id, householdMember.userId))
    .where(eq(householdMember.householdId, householdId))
    .orderBy(sql`case when ${householdMember.role} = 'owner' then 0 else 1 end`, asc(householdMember.joinedAt));
}

/** Invites not yet accepted or revoked (including expired ones, so they can be resent). */
export async function listOpenInvites(householdId) {
  return db
    .select({ id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt })
    .from(invite)
    .where(and(eq(invite.householdId, householdId), isNull(invite.acceptedAt), isNull(invite.revokedAt)))
    .orderBy(asc(invite.createdAt));
}

/**
 * The invite behind a link, with household and inviter names, or null if the token is unknown.
 * status: "pending" | "expired" | "accepted" | "revoked".
 */
export async function getInviteByToken(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const [row] = await db
    .select({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      householdId: invite.householdId,
      householdName: household.name,
      inviterName: user.name,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
    })
    .from(invite)
    .innerJoin(household, eq(household.id, invite.householdId))
    .innerJoin(user, eq(user.id, invite.invitedByUserId))
    .where(eq(invite.tokenHash, hashInviteToken(token)));
  if (!row) return null;

  const status = row.revokedAt ? "revoked" : row.acceptedAt ? "accepted" : row.expiresAt <= new Date() ? "expired" : "pending";
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = lower(${row.email})`);
  return { ...row, status, accountExists: Boolean(existing) };
}

// Locks a pending invite row for the rest of the transaction (so it can't be accepted twice).
async function lockPendingInvite(tx, token) {
  const [row] = await tx
    .select()
    .from(invite)
    .where(
      and(
        eq(invite.tokenHash, hashInviteToken(token)),
        isNull(invite.acceptedAt),
        isNull(invite.revokedAt),
        gt(invite.expiresAt, new Date()),
      ),
    )
    .for("update");
  if (!row) throw new InviteError("This invitation is no longer valid. Ask for a new one.");
  return row;
}

async function joinHousehold(tx, pending, userId) {
  await tx.insert(householdMember).values({ householdId: pending.householdId, userId, role: pending.role });
  await tx.update(invite).set({ acceptedAt: new Date(), acceptedByUserId: userId }).where(eq(invite.id, pending.id));

  // Tell the owner and whoever sent the invite, and welcome the new member.
  const [[joined], [inviter], [home]] = await Promise.all([
    tx.select({ name: user.name }).from(user).where(eq(user.id, userId)),
    tx.select({ name: user.name }).from(user).where(eq(user.id, pending.invitedByUserId)),
    tx.select({ name: household.name }).from(household).where(eq(household.id, pending.householdId)),
  ]);
  const owners = await memberIds(tx, pending.householdId, { roles: ["owner"] });
  const recipients = [...new Set([...owners, pending.invitedByUserId])].filter(id => id && id !== userId);
  await notify(tx, {
    householdId: pending.householdId,
    userIds: recipients,
    type: "member",
    ...memberJoinedMessage({ memberName: joined.name, role: pending.role, householdName: home.name }),
    link: "/members",
  });
  await notify(tx, {
    householdId: pending.householdId,
    userIds: [userId],
    type: "member",
    ...welcomeMessage({ householdName: home.name, role: pending.role, inviterName: inviter?.name ?? "Someone" }),
    link: "/",
  });
}

/**
 * New person: creates their account (email already confirmed: the link proves they own it),
 * adds them to the household with the invited role and uses up the invite. All or nothing.
 */
export async function acceptInviteAsNewUser({ token, name, password }) {
  const passwordHash = await (await auth.$context).password.hash(password);

  return db.transaction(async tx => {
    const pending = await lockPendingInvite(tx, token);
    const email = pending.email.toLowerCase();

    const [taken] = await tx
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = ${email}`);
    if (taken) throw new InviteError("An account with this email already exists. Sign in to accept the invitation.");

    const userId = randomUUID();
    await tx.insert(user).values({ id: userId, name, email, emailVerified: true });
    // Same shape Better Auth uses for email + password logins.
    await tx.insert(account).values({ id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash });
    await joinHousehold(tx, pending, userId);
    return { email };
  });
}

/** Signed-in person whose email matches the invite. */
export async function acceptInviteAsExistingUser({ token, userId, email }) {
  return db.transaction(async tx => {
    const pending = await lockPendingInvite(tx, token);
    if (pending.email.toLowerCase() !== email.toLowerCase()) {
      throw new InviteError(`This invitation was sent to ${pending.email}. Sign in with that email to accept it.`);
    }
    const [membership] = await tx
      .select({ id: householdMember.id })
      .from(householdMember)
      .where(eq(householdMember.userId, userId))
      .limit(1);
    if (membership) {
      throw new InviteError("You already belong to a household. Being in more than one household isn't supported yet.");
    }
    await joinHousehold(tx, pending, userId);
  });
}
