import Panel from "@/components/home/Panel";

export default function HouseholdMembersPanel({
  inviteEmail,
  setInviteEmail,
  onInviteSubmit,
  members,
}) {
  return (
    <Panel
      title="Household members"
      subtitle="Invite people to view or edit the family budget."
    >
      <form className="flex gap-3" onSubmit={onInviteSubmit}>
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

      <div className="mt-5 space-y-3">
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
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">
        Family members can be granted edit or view-only access later when the
        backend and authentication layer are added.
      </div>
    </Panel>
  );
}
