"use client";

// Reminders: the add form (AddTaskForm, shown on its own) and one list with both bills to pay
// (recurring bills, and tasks with an amount) and things to do, then the recently finished ones (Undo).
// A repeating task never shows as finished: Done moves it on to its next due date.
import { useActionState } from "react";
import { BillRow } from "@/components/Reminders/BillReminderList";
import Badge from "@/components/ui/Badge";
import { buttonClasses, SubmitButton } from "@/components/ui/Button";
import TextField, { FormError, FormSuccess, InlineMessage, SelectField } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { addTaskAction, deleteTaskAction, setTaskDoneAction } from "@/lib/actions/reminders";
import { REMIND_DAY_CHOICES, TASK_KINDS, TASK_REPEATS } from "@/lib/reminders";

export function AddTaskForm({ members, defaultKind = "other" }) {
  const [state, formAction, pending] = useActionState(addTaskAction, {});
  const values = state.values ?? {};
  const t = useTranslations("reminders");
  const common = useTranslations("common");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2" noValidate>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <div className="sm:col-span-2">
        <TextField
          id="task-title"
          name="title"
          label={t("tasks.whatLabel")}
          placeholder={t("tasks.whatPlaceholder")}
          maxLength={120}
          defaultValue={values.title}
          error={state.errors?.title}
        />
      </div>
      <SelectField
        key={`kind-${values.kind ?? defaultKind}`}
        id="task-kind"
        name="kind"
        label={t("tasks.kind")}
        defaultValue={values.kind || defaultKind}
        error={state.errors?.kind}
      >
        {TASK_KINDS.map(kind => (
          <option key={kind} value={kind}>
            {t(`kinds.${kind}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        key={`repeat-${values.repeat}`}
        id="task-repeat"
        name="repeat"
        label={t("tasks.repeat")}
        defaultValue={values.repeat ?? ""}
        error={state.errors?.repeat}
      >
        <option value="">{t("repeats.none")}</option>
        {TASK_REPEATS.map(repeat => (
          <option key={repeat} value={repeat}>
            {t(`repeats.${repeat}`)}
          </option>
        ))}
      </SelectField>
      <TextField
        id="task-amount"
        name="amount"
        label={t("tasks.amount")}
        inputMode="decimal"
        placeholder={t("tasks.amountPlaceholder")}
        hint={t("tasks.amountHint")}
        defaultValue={values.amount}
        error={state.errors?.amount}
      />
      <TextField
        id="task-due"
        name="dueOn"
        type="date"
        label={t("tasks.dueOn")}
        hint={t("tasks.dueHint")}
        defaultValue={values.dueOn}
        error={state.errors?.dueOn}
      />
      <SelectField
        key={`remind-${values.remindDaysBefore}`}
        id="task-remind"
        name="remindDaysBefore"
        label={t("tasks.remindDaysBefore")}
        defaultValue={values.remindDaysBefore || "1"}
        error={state.errors?.remindDaysBefore}
      >
        {REMIND_DAY_CHOICES.map(days => (
          <option key={days} value={days}>
            {t(`remindChoices.${days}`)}
          </option>
        ))}
      </SelectField>
      <div>
        <SelectField
          key={`assignee-${values.assigneeUserId}`}
          id="task-assignee"
          name="assigneeUserId"
          label={t("tasks.assignee")}
          defaultValue={values.assigneeUserId ?? ""}
          error={state.errors?.assigneeUserId}
        >
          <option value="">{t("everyone")}</option>
          {members.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </SelectField>
      </div>
      <SubmitButton pending={pending} pendingText={common("saving")} className="sm:col-span-2">
        {t("tasks.add")}
      </SubmitButton>
    </form>
  );
}

function OpenTask({ item, canEdit }) {
  const [doneState, doneAction, donePending] = useActionState(setTaskDoneAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTaskAction, {});
  const t = useTranslations("reminders");
  // With an amount it's a bill to pay: the amount shows, and Done reads "Paid".
  const isBill = Boolean(item.amountLabel);

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Badge>{item.kindLabel}</Badge>
            {item.badge ? <Badge tone={item.badge.tone}>{item.badge.label}</Badge> : null}
            <span className="truncate">{item.detail}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isBill ? <p className="font-semibold text-rose-200">{item.amountLabel}</p> : null}
          {canEdit ? (
            <div className="flex shrink-0 items-center gap-2">
              <form action={doneAction}>
                <input type="hidden" name="taskId" value={item.id} />
                <input type="hidden" name="done" value="true" />
                <input type="hidden" name="dueDate" value={item.dueDate ?? ""} />
                <button
                  type="submit"
                  disabled={donePending}
                  aria-label={isBill ? t("bills.markPaidFor", { title: item.title }) : t("tasks.doneFor", { title: item.title })}
                  className={buttonClasses({ variant: "success", size: "xs" })}
                >
                  {donePending ? "…" : isBill ? t("tasks.paid") : t("tasks.done")}
                </button>
              </form>
              <form
                action={deleteAction}
                onSubmit={event => {
                  if (!window.confirm(t("tasks.confirmDelete", { title: item.title }))) event.preventDefault();
                }}
              >
                <input type="hidden" name="taskId" value={item.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  aria-label={t("tasks.deleteFor", { title: item.title })}
                  className={buttonClasses({ variant: "secondary", size: "xs", className: "hover:border-rose-400/50 hover:text-rose-200" })}
                >
                  {deletePending ? "…" : t("tasks.delete")}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
      {/* A repeating task stays listed after Done, so its "next due" message is shown here. */}
      <InlineMessage state={doneState.error || doneState.success ? doneState : deleteState.error ? deleteState : null} />
    </li>
  );
}

function DoneTask({ item, canEdit }) {
  const [state, formAction, pending] = useActionState(setTaskDoneAction, {});
  const t = useTranslations("reminders");
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-slate-400 line-through">{item.title}</p>
        {item.detail ? <p className="truncate text-xs text-slate-500">{item.detail}</p> : null}
        <InlineMessage state={state.error ? state : null} />
      </div>
      {canEdit ? (
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="taskId" value={item.id} />
          <input type="hidden" name="done" value="false" />
          <button
            type="submit"
            disabled={pending}
            aria-label={t("tasks.reopenFor", { title: item.title })}
            className={buttonClasses({ variant: "secondary", size: "xs" })}
          >
            {pending ? "…" : t("tasks.reopen")}
          </button>
        </form>
      ) : null}
    </li>
  );
}

/** items: bills ({ type: "bill" }) and tasks ({ type: "task" }) together, soonest first. */
export default function TaskPanel({ items, done, members, canEdit, today, emptyText }) {
  const t = useTranslations("reminders");
  return (
    <div className="space-y-4">
      {items.length ? (
        <ul aria-label={t("list.title")} className="space-y-2">
          {items.map(item =>
            item.type === "bill" ? (
              <BillRow key={`bill-${item.id}`} bill={item} members={members} canEdit={canEdit} today={today} />
            ) : (
              <OpenTask key={`task-${item.id}`} item={item} canEdit={canEdit} />
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{emptyText ?? t("tasks.empty")}</p>
      )}
      {done.length ? (
        <section aria-labelledby="done-tasks-heading">
          <h3 id="done-tasks-heading" className="mb-1 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            {t("tasks.doneTitle")}
          </h3>
          <ul className="space-y-1">
            {done.map(item => (
              <DoneTask key={item.id} item={item} canEdit={canEdit} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
