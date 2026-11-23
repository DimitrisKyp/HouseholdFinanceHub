// Household finance tables. Every finance row belongs to exactly one household,
// and access is decided by the user's role in `household_member`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// ── Shared helpers ───────────────────────────────────────────────────────────

const id = () => uuid("id").primaryKey().defaultRandom();

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Money is stored as exact numeric(12,2) and read back as a JS number.
const money = name => numeric(name, { precision: 12, scale: 2, mode: "number" });

const householdId = () =>
  uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" });

// ── Enums ────────────────────────────────────────────────────────────────────

// owner: the main account holder (exactly one per household) — manages members and settings.
// editor: invited member who can create and edit finance data.
// viewer: read-only access.
export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const recurringType = pgEnum("recurring_type", ["income", "expense"]);
export const frequency = pgEnum("frequency", ["weekly", "monthly", "yearly"]);
export const goalStatus = pgEnum("goal_status", ["active", "paused", "completed", "cancelled"]);

// ── Households and membership ────────────────────────────────────────────────

export const household = pgTable("household", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Athens"),
  ...timestamps,
});

export const householdMember = pgTable(
  "household_member",
  {
    id: id(),
    householdId: householdId(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("editor"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  t => [
    uniqueIndex("household_member_household_user_uq").on(t.householdId, t.userId),
    index("household_member_user_idx").on(t.userId),
    // The database itself guarantees a household can never have two owners.
    uniqueIndex("household_member_one_owner_uq")
      .on(t.householdId)
      .where(sql`${t.role} = 'owner'`),
  ],
);

export const invite = pgTable(
  "invite",
  {
    id: id(),
    householdId: householdId(),
    email: varchar("email", { length: 255 }).notNull(),
    role: memberRole("role").notNull().default("editor"),
    // Only a hash of the invite token is stored; the raw token lives in the emailed link.
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  t => [
    // Invites can never grant ownership.
    check("invite_role_not_owner_chk", sql`${t.role} <> 'owner'`),
    // At most one open invite per email per household.
    uniqueIndex("invite_open_email_uq")
      .on(t.householdId, sql`lower(${t.email})`)
      .where(sql`${t.acceptedAt} is null and ${t.revokedAt} is null`),
  ],
);

// ── Budgeting ────────────────────────────────────────────────────────────────

// One category list shared by day-to-day expenses, recurring bills and budgets.
export const category = pgTable(
  "category",
  {
    id: id(),
    householdId: householdId(),
    name: varchar("name", { length: 50 }).notNull(),
    // Planned spending per month for this category; null = no budget set.
    monthlyLimit: money("monthly_limit"),
    isArchived: boolean("is_archived").notNull().default(false),
    ...timestamps,
  },
  t => [
    uniqueIndex("category_household_name_uq").on(t.householdId, sql`lower(${t.name})`),
    check("category_monthly_limit_chk", sql`${t.monthlyLimit} is null or ${t.monthlyLimit} >= 0`),
  ],
);

export const expense = pgTable(
  "expense",
  {
    id: id(),
    householdId: householdId(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 120 }).notNull(),
    notes: text("notes"),
    amount: money("amount").notNull(),
    spentOn: date("spent_on").notNull(),
    paidByUserId: text("paid_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  t => [
    check("expense_amount_chk", sql`${t.amount} > 0`),
    // Monthly reports filter on (household, date range), e.g. spent_on >= '2026-11-01'.
    index("expense_household_spent_on_idx").on(t.householdId, t.spentOn),
    index("expense_category_idx").on(t.categoryId),
  ],
);

// Salary, side income, rent, subscriptions — anything that repeats.
export const recurringItem = pgTable(
  "recurring_item",
  {
    id: id(),
    householdId: householdId(),
    type: recurringType("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    amount: money("amount").notNull(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    // Whose income / who usually pays.
    memberUserId: text("member_user_id").references(() => user.id, { onDelete: "set null" }),
    frequency: frequency("frequency").notNull().default("monthly"),
    dayOfMonth: integer("day_of_month"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    isActive: boolean("is_active").notNull().default(true),
    // Payment reminders for bills (lib/reminders.js). due_on is the first due date: later ones
    // follow from it by `frequency`. null = no reminder. paid_through is the latest due date
    // marked as paid, so the next one is the first due date after it.
    dueOn: date("due_on"),
    paidThrough: date("paid_through"),
    // Also remind this many days before the due date (0 = only on the day).
    remindDaysBefore: integer("remind_days_before").notNull().default(3),
    ...timestamps,
  },
  t => [
    check("recurring_item_amount_chk", sql`${t.amount} > 0`),
    check("recurring_item_day_chk", sql`${t.dayOfMonth} is null or ${t.dayOfMonth} between 1 and 31`),
    check("recurring_item_dates_chk", sql`${t.endsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
    check("recurring_item_remind_days_chk", sql`${t.remindDaysBefore} between 0 and 30`),
    index("recurring_item_household_idx").on(t.householdId, t.type, t.isActive),
  ],
);

// ── Tasks ────────────────────────────────────────────────────────────────────

// One-off things to do for the house ("buy a new kettle"), optionally by a date and for one member.
export const task = pgTable(
  "task",
  {
    id: id(),
    householdId: householdId(),
    title: varchar("title", { length: 120 }).notNull(),
    // null = whenever; no reminder is sent.
    dueOn: date("due_on"),
    remindDaysBefore: integer("remind_days_before").notNull().default(1),
    // Who should do it; null = anyone (owner and editors get the reminder).
    assigneeUserId: text("assignee_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneByUserId: text("done_by_user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  t => [
    check("task_remind_days_chk", sql`${t.remindDaysBefore} between 0 and 30`),
    index("task_household_open_idx").on(t.householdId, t.doneAt),
  ],
);

// ── Goals ────────────────────────────────────────────────────────────────────

export const goal = pgTable(
  "goal",
  {
    id: id(),
    householdId: householdId(),
    name: varchar("name", { length: 120 }).notNull(),
    note: text("note"),
    targetAmount: money("target_amount").notNull(),
    targetDate: date("target_date"),
    status: goalStatus("status").notNull().default("active"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  t => [check("goal_target_amount_chk", sql`${t.targetAmount} > 0`), index("goal_household_status_idx").on(t.householdId, t.status)],
);

// Money put towards (or taken back from) a goal. Progress = sum(amount) / target_amount,
// so it is always derived from real history and never stored separately.
export const goalContribution = pgTable(
  "goal_contribution",
  {
    id: id(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    contributedOn: date("contributed_on").notNull(),
    note: text("note"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  t => [check("goal_contribution_amount_chk", sql`${t.amount} <> 0`), index("goal_contribution_goal_idx").on(t.goalId)],
);

// ── Notifications ────────────────────────────────────────────────────────────

// In-app messages: budget alerts, goal reminders, invite updates.
export const notification = pgTable(
  "notification",
  {
    id: id(),
    householdId: householdId(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    // English text, kept for notifications created before `data` existed.
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body"),
    // The values the message is built from (names, amounts...), so it's shown in each
    // reader's language. See renderNotification in lib/notification-messages.js.
    data: jsonb("data"),
    link: text("link"),
    // Stops scheduled jobs from sending the same alert twice,
    // e.g. "budget:<categoryId>:2026-11:90".
    dedupeKey: varchar("dedupe_key", { length: 200 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [uniqueIndex("notification_user_dedupe_uq").on(t.userId, t.dedupeKey), index("notification_user_unread_idx").on(t.userId, t.readAt)],
);
