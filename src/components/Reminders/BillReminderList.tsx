"use client";

// Recurring bills with their payment reminder: when the next one is due, "Mark as paid" (optionally
// logging the expense), and a small form to set, change or remove the reminder.
import { useActionState } from "react";
import type { MemberOption } from "@/components/Budget/RecurringItemsPanel";
import Badge from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import TextField, { InlineMessage, SelectField } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { markBillPaidAction, saveBillReminderAction } from "@/lib/actions/reminders";
import { REMIND_DAY_CHOICES, type reminderBadge } from "@/lib/reminders";

/** A due-date badge ("Overdue by 2 days", "In 3 days"…), or null without a due date. */
export type DueBadge = ReturnType<typeof reminderBadge>;

/**
 * A recurring bill in the Reminders list, labels already in the household currency and reader's
 * language. `type: "bill"` tells it apart from a task in the same list (see ReminderListItem).
 */
export type BillReminderItem = {
  type: "bill";
  id: string;
  title: string;
  amountLabel: string;
  detail: string;
  /** Next due date ("YYYY-MM-DD"), or null when no reminder is set. */
  dueDate: string | null;
  dueLabel: string | null;
  badge: DueBadge;
  /** "" for everyone. */
  payerUserId: string;
  payerLabel: string | null;
  remindDaysBefore: number;
  /** Whether paying it can log an expense (the bill has a category). */
  canLog: boolean;
};

type BillRowProps = {
  bill: BillReminderItem;
  members: MemberOption[];
  canEdit: boolean;
  today: string;
};

function ReminderForm({ bill, members, today }: Omit<BillRowProps, "canEdit">) {
  const [state, formAction, pending] = useActionState(saveBillReminderAction, {});
  const values = state.values ?? {};
  const t = useTranslations("reminders");
  const prefix = `bill-${bill.id}`;

  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-3" noValidate>
      <input type="hidden" name="itemId" value={bill.id} />
      <TextField
        id={`${prefix}-due`}
        name="dueOn"
        type="date"
        label={t("bills.dueOn")}
        defaultValue={values.dueOn ?? bill.dueDate ?? today}
        error={state.errors?.dueOn}
      />
      <SelectField
        id={`${prefix}-remind`}
        name="remindDaysBefore"
        label={t("bills.remindDaysBefore")}
        defaultValue={values.remindDaysBefore ?? String(bill.remindDaysBefore)}
        error={state.errors?.remindDaysBefore}
      >
        {REMIND_DAY_CHOICES.map(days => (
          <option key={days} value={days}>
            {t(`remindChoices.${days}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        id={`${prefix}-payer`}
        name="payerUserId"
        label={t("bills.whoPays")}
        defaultValue={values.payerUserId ?? bill.payerUserId}
        error={state.errors?.payerUserId}
      >
        <option value="">{t("everyone")}</option>
        {members.map(member => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={pending} className={buttonClasses({ size: "sm" })}>
          {pending ? "…" : t("bills.save")}
        </button>
        {bill.dueDate ? (
          <button
            type="submit"
            name="remove"
            value="true"
            disabled={pending}
            aria-label={t("bills.removeFor", { title: bill.title })}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("bills.remove")}
          </button>
        ) : null}
      </div>
      <div className="sm:col-span-3">
        <InlineMessage state={state.errors ? null : state} />
      </div>
    </form>
  );
}

// dueDate is passed on its own: the form only exists for a bill with a due date, and a separate
// string prop says so in the type (bill.dueDate itself may be null).
function MarkPaidForm({ bill, dueDate }: { bill: BillReminderItem; dueDate: string }) {
  const [state, formAction, pending] = useActionState(markBillPaidAction, {});
  const t = useTranslations("reminders");
  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="itemId" value={bill.id} />
      <input type="hidden" name="dueDate" value={dueDate} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("bills.markPaidFor", { title: bill.title })}
        className={buttonClasses({ variant: "success", size: "xs" })}
      >
        {pending ? "…" : t("bills.markPaid")}
      </button>
      {bill.canLog ? (
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" name="logExpense" defaultChecked className="h-4 w-4 accent-cyan-500" />
          {t("bills.logExpense")}
        </label>
      ) : null}
      <InlineMessage state={state} />
    </form>
  );
}

export function BillRow({ bill, members, canEdit, today }: BillRowProps) {
  const t = useTranslations("reminders");
  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{bill.title}</p>
          <p className="truncate text-sm text-slate-400">{bill.detail}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {bill.badge ? <Badge tone={bill.badge.tone}>{bill.badge.label}</Badge> : <span>{t("bills.noReminder")}</span>}
            {bill.dueLabel ? <span>{bill.dueLabel}</span> : null}
            {bill.payerLabel ? <span>· {bill.payerLabel}</span> : null}
          </p>
        </div>
        <p className="shrink-0 font-semibold text-rose-200">{bill.amountLabel}</p>
      </div>
      {canEdit && bill.dueDate ? <MarkPaidForm bill={bill} dueDate={bill.dueDate} /> : null}
      {canEdit ? (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs text-cyan-300 select-none hover:text-cyan-200">
            {bill.dueDate ? t("bills.editReminder") : t("bills.setReminder")}
          </summary>
          <ReminderForm bill={bill} members={members} today={today} />
        </details>
      ) : null}
    </li>
  );
}
