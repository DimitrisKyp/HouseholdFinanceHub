"use client";

import { useActionState } from "react";
import { changeMemberRoleAction, removeMemberAction } from "@/lib/actions/members";
import { ROLE_LABELS } from "@/lib/permissions";

const selectClass =
  "rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400 disabled:opacity-60";

function Message({ state }) {
  if (state.error)
    return (
      <p role="alert" className="mt-2 text-xs text-rose-300">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="mt-2 text-xs text-emerald-300">
        {state.success}
      </p>
    );
  return null;
}

// Removing is handled by the list, not the row: the row disappears once it works, and the
// result ("Sam was removed from the household.") has to stay on screen.
function MemberRow({ member, canManage, isYou, removeAction, removePending }) {
  const [roleState, roleAction, rolePending] = useActionState(changeMemberRoleAction, {});
  const editable = canManage && member.role !== "owner";

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">
            {member.name}
            {isYou ? <span className="ml-2 text-xs font-normal text-slate-400">(you)</span> : null}
          </p>
          <p className="truncate text-sm text-slate-400">{member.email}</p>
          <p className="text-xs text-slate-500">Joined {member.joinedLabel}</p>
        </div>

        {editable ? (
          <div className="flex items-center gap-2">
            <form action={roleAction}>
              <input type="hidden" name="memberId" value={member.memberId} />
              <label className="sr-only" htmlFor={`role-${member.memberId}`}>
                Role for {member.name}
              </label>
              <select
                id={`role-${member.memberId}`}
                name="role"
                defaultValue={member.role}
                disabled={rolePending}
                onChange={event => event.currentTarget.form.requestSubmit()}
                className={selectClass}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </form>
            <form
              action={removeAction}
              onSubmit={event => {
                if (!window.confirm(`Remove ${member.name} from the household? They'll lose access immediately.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="memberId" value={member.memberId} />
              <button
                type="submit"
                disabled={removePending}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
              >
                {removePending ? "Removing…" : "Remove"}
              </button>
            </form>
          </div>
        ) : (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{ROLE_LABELS[member.role]}</span>
        )}
      </div>
      <Message state={roleState} />
    </li>
  );
}

export default function MemberList({ members, canManage, currentUserId }) {
  const [removeState, removeAction, removePending] = useActionState(removeMemberAction, {});

  return (
    <div>
      <div className="[&>p]:mt-0 [&>p]:mb-3">
        <Message state={removeState} />
      </div>
      <ul className="space-y-3">
        {members.map(member => (
          <MemberRow
            key={member.memberId}
            member={member}
            canManage={canManage}
            isYou={member.userId === currentUserId}
            removeAction={removeAction}
            removePending={removePending}
          />
        ))}
      </ul>
    </div>
  );
}
