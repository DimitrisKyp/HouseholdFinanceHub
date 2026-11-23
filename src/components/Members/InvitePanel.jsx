"use client";

import { useActionState, useOptimistic } from "react";
import TextField, { FormError, FormSuccess } from "@/components/ui/Field";
import { inviteMemberAction, resendInviteAction, revokeInviteAction } from "@/lib/actions/members";
import { EMAIL_PATTERN, field } from "@/lib/forms";
import { useTranslations } from "@/i18n/client";
import { buttonClasses } from "@/components/ui/Button";

function InviteForm({ onSubmitting }) {
  const t = useTranslations("members");
  const [state, formAction, pending] = useActionState(
    async (previous, formData) => {
      onSubmitting(formData);
      return inviteMemberAction(previous, formData);
    },
    { values: { role: "editor" } },
  );

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <TextField
        id="email"
        label={t("invite.email")}
        type="email"
        autoComplete="off"
        placeholder={t("invite.emailPlaceholder")}
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <div>
        <label htmlFor="role" className="mb-1 block text-sm text-slate-300">
          {t("invite.role")}
        </label>
        <select
          id="role"
          name="role"
          defaultValue={state.values?.role ?? "editor"}
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400"
        >
          <option value="editor">{t("invite.editorOption")}</option>
          <option value="viewer">{t("invite.viewerOption")}</option>
        </select>
        {state.errors?.role ? <p className="mt-1 text-xs text-rose-300">{state.errors.role}</p> : null}
      </div>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md", block: true })}>
        {pending ? t("invite.sending") : t("invite.send")}
      </button>
    </form>
  );
}

/** An invitation being sent: shown straight away, without actions until it's saved. */
function SendingInvite({ invite }) {
  const t = useTranslations("members");
  const common = useTranslations("common");
  return (
    <li aria-busy="true" className="rounded-xl border border-dashed border-cyan-400/40 bg-cyan-400/5 px-4 py-3">
      <p className="truncate text-sm font-medium text-white">{invite.email}</p>
      <p className="text-xs text-slate-400">
        {common(`roles.${invite.role}`)} · {t("invite.sending")}
      </p>
    </li>
  );
}

function PendingInvite({ invite }) {
  const t = useTranslations("members");
  const common = useTranslations("common");
  const [resendState, resendAction, resendPending] = useActionState(resendInviteAction, {});
  const [revokeState, revokeAction, revokePending] = useActionState(revokeInviteAction, {});
  const message = resendState.error || resendState.success ? resendState : revokeState;

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{invite.email}</p>
          <p className={`text-xs ${invite.expired ? "text-amber-300" : "text-slate-400"}`}>
            {common(`roles.${invite.role}`)} ·{" "}
            {invite.expired ? t("invite.expired", { date: invite.expiresLabel }) : t("invite.expires", { date: invite.expiresLabel })}
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
              {resendPending ? t("invite.sending") : t("invite.resend")}
            </button>
          </form>
          <form action={revokeAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button
              type="submit"
              disabled={revokePending}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
            >
              {t("invite.cancel")}
            </button>
          </form>
        </div>
      </div>
      {message.error ? (
        <p role="alert" className="mt-2 text-xs text-rose-300">
          {message.error}
        </p>
      ) : null}
      {message.success ? (
        <p role="status" className="mt-2 text-xs text-emerald-300">
          {message.success}
        </p>
      ) : null}
    </li>
  );
}

// Roles an invitation can give (the owner is never invited).
const INVITABLE = ["editor", "viewer"];

export default function InvitePanel({ invites }) {
  const t = useTranslations("members");
  // Optimistic UI: the invitation is listed while it's saved and emailed. The page's fresh list
  // replaces it afterwards; after an error it disappears and the form says why. Inviting an
  // address that's already pending refreshes that invitation, so it replaces the row.
  const [list, addSending] = useOptimistic(invites, (current, sending) => [
    ...current.filter(invite => invite.email !== sending.email),
    sending,
  ]);
  const showSending = formData => {
    const email = field(formData, "email").toLowerCase();
    const role = field(formData, "role");
    if (!EMAIL_PATTERN.test(email) || !INVITABLE.includes(role)) return;
    addSending({ id: `sending-${email}`, email, role, sending: true });
  };

  return (
    <div className="space-y-5">
      <InviteForm onSubmitting={showSending} />
      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">{t("invite.pending")}</p>
        {list.length ? (
          <ul aria-label={t("invite.pending")} className="space-y-2">
            {list.map(invite =>
              invite.sending ? <SendingInvite key={invite.id} invite={invite} /> : <PendingInvite key={invite.id} invite={invite} />,
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t("invite.none")}</p>
        )}
      </div>
    </div>
  );
}
