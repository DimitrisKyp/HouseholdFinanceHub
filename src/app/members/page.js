"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import HouseholdMembersPanel from "@/components/home/HouseholdMembersPanel";
import Panel from "@/components/home/Panel";
import { inviteMember } from "@/lib/features/financeSlice";

export default function MembersPage() {
  const dispatch = useDispatch();
  const finance = useSelector((state) => state.finance);
  const [inviteEmail, setInviteEmail] = useState("");

  const handleInviteSubmit = (event) => {
    event.preventDefault();

    if (!inviteEmail) {
      return;
    }

    dispatch(inviteMember(inviteEmail));
    setInviteEmail("");
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Household members
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
                Invite people and manage access.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 ">
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

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <HouseholdMembersPanel
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            onInviteSubmit={handleInviteSubmit}
            members={finance.members}
          />

          <Panel title="Access model" subtitle="A simple plan for roles and permissions.">
            <div className="space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="font-medium text-white">Owner</p>
                <p className="mt-1 text-slate-400">Full control over budgets, members, and future settings.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="font-medium text-white">Editor</p>
                <p className="mt-1 text-slate-400">Can add expenses, update budgets, and track shared finances.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="font-medium text-white">Viewer</p>
                <p className="mt-1 text-slate-400">Read-only access for family members who only need visibility.</p>
              </div>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
