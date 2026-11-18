"use client";

import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";

function InitialsAvatar({ name, avatarUrl }) {
  const initials = name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return <Image src={avatarUrl} alt={name} width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10" />;
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-sm font-bold text-white ring-2 ring-white/10 select-none">
      {initials}
    </div>
  );
}

// Labels (balance, date) are computed on the server in the household's currency and timezone.
export default function TopBar({ balanceLabel, balanceNegative, dateLabel, currentUser }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-widest text-slate-500 uppercase">Left this month</p>
        <p className={`text-2xl leading-tight font-bold ${balanceNegative ? "text-rose-400" : "text-emerald-400"}`}>{balanceLabel}</p>
      </div>

      <p className="hidden shrink-0 text-sm text-slate-400 sm:block">{dateLabel}</p>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/account"
          title="Your account"
          className="group flex items-center gap-3 rounded-2xl px-4 py-2 transition hover:border-cyan-400/30 hover:bg-white/10"
        >
          <div className="text-right">
            <p className="text-sm leading-tight font-semibold text-white transition-colors group-hover:text-cyan-300">{currentUser.name}</p>
            <p className="text-xs text-slate-400">
              {[currentUser.householdName, ROLE_LABELS[currentUser.role]].filter(Boolean).join(" · ")}
            </p>
          </div>
          <InitialsAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} />
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
