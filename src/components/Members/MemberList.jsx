"use client";

import { useActionState } from "react";
import { changeMemberRoleAction, removeMemberAction } from "@/lib/actions/members";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("members");
  const common = useTranslations("common");

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">
            {member.name}
            {isYou ? <span className="ml-2 text-xs font-normal text-slate-400">{t("list.you")}</span> : null}
          </p>
          <p className="truncate text-sm text-slate-400">{member.email}</p>
          <p className="text-xs text-slate-500">{t("list.joined", { date: member.joinedLabel })}</p>
        </div>

        {editable ? (
          <div className="flex items-center gap-2">
            {/* A Save button rather than saving on change: a plain form submit also works before the
                page's JavaScript has loaded, so a quick change can't get lost. */}
            <form action={roleAction} className="flex items-center gap-2">
              <input type="hidden" name="memberId" value={member.memberId} />
              <label className="sr-only" htmlFor={`role-${member.memberId}`}>
                {t("list.roleFor", { name: member.name })}
              </label>
              <select id={`role-${member.memberId}`} name="role" defaultValue={member.role} className={selectClass}>
                <option value="editor">{common("roles.editor")}</option>
                <option value="viewer">{common("roles.viewer")}</option>
              </select>
              <button
                type="submit"
                disabled={rolePending}
                aria-label={t("list.saveRoleFor", { name: member.name })}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:opacity-60"
              >
                {rolePending ? t("list.saving") : t("list.save")}
              </button>
            </form>
            <form
              action={removeAction}
              onSubmit={event => {
                if (!window.confirm(t("list.confirmRemove", { name: member.name }))) {
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
                {removePending ? t("list.removing") : t("list.remove")}
              </button>
            </form>
          </div>
        ) : (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{common(`roles.${member.role}`)}</span>
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
