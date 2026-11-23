"use client";

// One savings goal: progress, money in/out, status changes and recent history.
import { useActionState } from "react";
import { InlineMessage } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { addContributionAction, deleteGoalAction, setGoalStatusAction } from "@/lib/actions/goals";

const smallButton =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-60";

// [message key, badge classes] per status.
const STATUS_BADGES = {
  active: null,
  paused: ["card.paused", "bg-amber-400/15 text-amber-200"],
  completed: ["card.completed", "bg-emerald-400/15 text-emerald-200"],
};

function ContributionForm({ goal }) {
  const [state, formAction, pending] = useActionState(addContributionAction, {});
  const t = useTranslations("goals");
  const errorId = `contribution-${goal.id}-error`;

  return (
    <form action={formAction} className="mt-3" noValidate>
      <input type="hidden" name="goalId" value={goal.id} />
      <div className="flex flex-wrap items-start gap-2">
        <label className="sr-only" htmlFor={`amount-${goal.id}`}>
          {t("card.amountFor", { name: goal.name })}
        </label>
        <input
          id={`amount-${goal.id}`}
          name="amount"
          inputMode="decimal"
          placeholder={t("card.amountPlaceholder")}
          defaultValue={state.values?.amount}
          aria-invalid={state.errors?.amount ? true : undefined}
          aria-describedby={state.errors?.amount ? errorId : undefined}
          className={`w-28 rounded-lg border bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
            state.errors?.amount ? "border-rose-400/70" : "border-white/10"
          }`}
        />
        <label className="sr-only" htmlFor={`note-${goal.id}`}>
          {t("card.note")}
        </label>
        <input
          id={`note-${goal.id}`}
          name="note"
          placeholder={t("card.notePlaceholder")}
          maxLength={500}
          defaultValue={state.values?.note}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
        />
        <button
          type="submit"
          name="direction"
          value="add"
          disabled={pending}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {t("card.addMoney")}
        </button>
        <button type="submit" name="direction" value="withdraw" disabled={pending} className={`${smallButton} hover:border-rose-400/50`}>
          {t("card.withdraw")}
        </button>
      </div>
      {state.errors?.amount || state.errors?.note ? (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-300">
          {state.errors.amount ?? state.errors.note}
        </p>
      ) : (
        <InlineMessage state={state} />
      )}
    </form>
  );
}

function StatusButtons({ goal }) {
  const [statusState, statusAction, statusPending] = useActionState(setGoalStatusAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGoalAction, {});
  const t = useTranslations("goals");
  const options =
    goal.status === "active"
      ? [
          ["completed", t("card.markCompleted")],
          ["paused", t("card.pause")],
        ]
      : [["active", goal.status === "paused" ? t("card.resume") : t("card.reopen")]];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map(([status, label]) => (
          <form key={status} action={statusAction}>
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="status" value={status} />
            <button type="submit" disabled={statusPending} className={`${smallButton} hover:border-cyan-400/50`}>
              {label}
            </button>
          </form>
        ))}
        <form
          action={deleteAction}
          onSubmit={event => {
            if (!window.confirm(t("card.confirmDelete", { name: goal.name }))) event.preventDefault();
          }}
        >
          <input type="hidden" name="goalId" value={goal.id} />
          <button type="submit" disabled={deletePending} className={`${smallButton} hover:border-rose-400/50 hover:text-rose-200`}>
            {deletePending ? t("card.deleting") : t("card.delete")}
          </button>
        </form>
      </div>
      <InlineMessage state={statusState.error ? statusState : deleteState.error ? deleteState : null} />
    </div>
  );
}

export default function GoalCard({ goal, canEdit }) {
  const t = useTranslations("goals");
  const badge = STATUS_BADGES[goal.status];

  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white">{goal.name}</h3>
            {badge ? <span className={`rounded-full px-2 py-0.5 text-xs ${badge[1]}`}>{t(badge[0])}</span> : null}
            {goal.reached && goal.status !== "completed" ? (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-200">{t("card.targetReached")}</span>
            ) : null}
          </div>
          {goal.note ? <p className="mt-1 text-xs text-slate-400">{goal.note}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-white">
            {goal.savedLabel} <span className="font-normal text-slate-400">{t("card.of", { target: goal.targetLabel })}</span>
          </p>
          <p className="text-xs text-slate-400">{goal.percent}%</p>
        </div>
      </div>

      <div
        className="mt-3 h-2 rounded-full bg-white/10"
        role="progressbar"
        aria-label={t("card.progress", { name: goal.name })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={goal.percent}
      >
        <div
          className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
          style={{ width: `${goal.percent}%` }}
        />
      </div>

      {goal.planLabel ? <p className="mt-2 text-xs text-slate-400">{goal.planLabel}</p> : null}
      {goal.forecastLabel ? <p className="mt-1 text-xs text-slate-400">{goal.forecastLabel}</p> : null}

      {canEdit && goal.status === "active" ? <ContributionForm goal={goal} /> : null}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        {goal.contributions.length ? (
          <details className="min-w-0 flex-1 text-xs">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
              {t("card.history", { count: goal.contributionCount })}
            </summary>
            <ul className="mt-2 space-y-1">
              {goal.contributions.map(item => (
                <li key={item.id} className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="min-w-0 truncate text-slate-400">
                    {item.dayLabel}
                    {item.userName ? ` · ${item.userName}` : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                  <span className={`shrink-0 font-medium ${item.amount < 0 ? "text-rose-200" : "text-emerald-200"}`}>
                    {item.amountLabel}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-xs text-slate-500">{t("card.noMoney")}</p>
        )}
        {canEdit ? <StatusButtons goal={goal} /> : null}
      </div>
    </article>
  );
}
