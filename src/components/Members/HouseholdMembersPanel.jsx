"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Panel from "@/components/Panel";
import { inviteMember } from "@/store/features/financeSlice";

export default function HouseholdMembersPanel() {
  const dispatch = useDispatch();
  const members = useSelector((state) => state.finance.members);
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
    <Panel
      title="Household members"
      subtitle="Invite people, manage who can access the workspace, and review role capabilities."
      className="flex h-full min-h-0 flex-col"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <form className="flex gap-3" onSubmit={handleInviteSubmit}>
        <input
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="email@family.com"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
        />
        <button
          className="rounded-xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
          type="submit"
        >
          Invite
        </button>
      </form>

      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {members.map((member) => (
          <div
            key={member.email}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
          >
            <div>
              <p className="font-medium text-white">{member.name}</p>
              <p className="text-sm text-slate-400">{member.email}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
              {member.role}
            </span>
          </div>
        ))}

        <div className="mt-2 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Access model</p>
          <p className="mt-1 text-[11px] text-slate-500">A simple plan for roles and permissions.</p>

          <div className="mt-2 space-y-2 text-xs leading-5 text-slate-300">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">Owner</p>
              <p className="mt-0.5 text-slate-400">Full control over budgets, members, and future settings.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">Editor</p>
              <p className="mt-0.5 text-slate-400">Can add expenses, update budgets, and track shared finances.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">Viewer</p>
              <p className="mt-0.5 text-slate-400">Read-only access for family members who only need visibility.</p>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
