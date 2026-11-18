import Link from "next/link";
import AddGoalForm from "@/components/Goals/AddGoalForm";
import GoalCard from "@/components/Goals/GoalCard";
import SavingsForecast from "@/components/Goals/SavingsForecast";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import { goalView } from "@/lib/finance";
import { loadSavingsForecast } from "@/lib/forecast-data";
import { formatMoney, todayIn } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "Goals · Household Finance Hub" };

export default async function GoalsPage() {
  const { householdId, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const today = todayIn(timezone);

  const { forecast, goals, paces } = await loadSavingsForecast(householdId, { today, timezone, currency });
  const views = goals.map(item => goalView(item, { currency, today, pace: paces.get(item.id) }));
  const open = views.filter(item => item.status !== "completed");
  const completed = views.filter(item => item.status === "completed");
  const totalSaved = goals.filter(item => item.status !== "completed").reduce((sum, item) => sum + item.saved, 0);

  // Earliest target date allowed in the form: tomorrow (compared as YYYY-MM-DD strings on the server too).
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">Goals</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">Plan what matters, track progress.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {canEdit
                  ? "Set a target, record money as you put it aside, and see how much to save each month to get there on time."
                  : "The household's savings goals and how close they are. Only owners and editors can change them."}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
                <p className="text-xs text-emerald-200">Saved towards open goals</p>
                <p className="text-xl leading-tight font-semibold">{formatMoney(totalSaved, currency)}</p>
              </div>
              <Link
                href="/"
                className="inline-flex w-fit shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <Panel title="Savings forecast" subtitle="What's likely left over each month, based on your Budget and recent spending.">
          <SavingsForecast forecast={forecast} />
        </Panel>

        {canEdit ? (
          <Panel title="New goal" subtitle="What are you saving for, and how much do you need?">
            <AddGoalForm minDate={tomorrow} />
          </Panel>
        ) : null}

        <Panel title="Goals" subtitle={open.length ? `${open.length} open goal${open.length === 1 ? "" : "s"}` : "No open goals."}>
          {open.length ? (
            <div className="space-y-3">
              {open.map(item => (
                <GoalCard key={item.id} goal={item} canEdit={canEdit} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{canEdit ? "Add your first goal above." : "Nothing here yet."}</p>
          )}
        </Panel>

        {completed.length ? (
          <Panel title={`Completed (${completed.length})`} subtitle="Goals you've reached. Reopen one to keep saving towards it.">
            <div className="space-y-3">
              {completed.map(item => (
                <GoalCard key={item.id} goal={item} canEdit={canEdit} />
              ))}
            </div>
          </Panel>
        ) : null}
      </main>
    </div>
  );
}
