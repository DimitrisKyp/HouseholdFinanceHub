"use client";

import { useActionState } from "react";
import AuthField, { FormError, FormSuccess } from "@/components/Auth/AuthField";
import { inviteMemberAction, resendInviteAction, revokeInviteAction } from "@/lib/actions/members";
import { ROLE_LABELS } from "@/lib/permissions";

function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteMemberAction, { values: { role: "editor" } });

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <AuthField
        id="email"
        label="Email address"
        type="email"
        autoComplete="off"
        placeholder="name@example.com"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <div>
        <label htmlFor="role" className="mb-1 block text-sm text-slate-300">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={state.values?.role ?? "editor"}
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400"
        >
          <option value="editor">Editor: can add and edit expenses, budgets and goals</option>
          <option value="viewer">Viewer: can only look</option>
        </select>
        {state.errors?.role ? <p className="mt-1 text-xs text-rose-300">{state.errors.role}</p> : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}

function PendingInvite({ invite }) {
  const [resendState, resendAction, resendPending] = useActionState(resendInviteAction, {});
  const [revokeState, revokeAction, revokePending] = useActionState(revokeInviteAction, {});
  const message = resendState.error || resendState.success ? resendState : revokeState;

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{invite.email}</p>
          <p className={`text-xs ${invite.expired ? "text-amber-300" : "text-slate-400"}`}>
            {ROLE_LABELS[invite.role]} · {invite.expired ? `Expired ${invite.expiresLabel}` : `Expires ${invite.expiresLabel}`}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={resendAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button
              type="submit"
              disabled={resendPending}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:opacity-60"
            >
              {resendPending ? "Sending…" : "Resend"}
            </button>
          </form>
          <form action={revokeAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button
              type="submit"
              disabled={revokePending}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
      {message.error ? <p role="alert" className="mt-2 text-xs text-rose-300">{message.error}</p> : null}
      {message.success ? <p role="status" className="mt-2 text-xs text-emerald-300">{message.success}</p> : null}
    </li>
  );
}

export default function InvitePanel({ invites }) {
  return (
    <div className="space-y-5">
      <InviteForm />
      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">Pending invitations</p>
        {invites.length ? (
          <ul className="space-y-2">
            {invites.map(invite => (
              <PendingInvite key={invite.id} invite={invite} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No pending invitations.</p>
        )}
      </div>
    </div>
  );
}
