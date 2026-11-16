"use client";

import Link from "next/link";
import HouseholdMembersPanel from "@/components/Members/HouseholdMembersPanel";
import EditProfilePanel from "@/components/Members/EditProfilePanel";

export default function MembersPage() {
  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-3 py-3 text-white md:px-5 md:py-4">
      <main className="mx-auto flex h-full w-full max-w-none flex-col gap-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Household members
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-3xl">
                Invite people and manage profile.
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300 ">
                Keep the daily dashboard focused on finance work while this route handles
                family invitations, viewing roles, and future permissions.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.15fr_1.15fr]">
          <HouseholdMembersPanel />
          <EditProfilePanel />
        </div>
      </main>
    </div>
  );
}
