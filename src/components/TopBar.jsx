"use client";

import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";

function InitialsAvatar({ name, avatarUrl }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-sm font-bold text-white ring-2 ring-white/10 select-none">
      {initials}
    </div>
  );
}

export default function TopBar({ availableBalance, currentUser, formatCurrency }) {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Available balance
        </p>
        <p className="text-2xl font-bold leading-tight text-emerald-400">
          {formatCurrency(availableBalance)}
        </p>
      </div>

      <p className="hidden shrink-0 text-sm text-slate-400 sm:block">{dateStr}</p>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/members"
          className="group flex items-center gap-3 px-4 rounded-2xl py-2 transition hover:border-cyan-400/30 hover:bg-white/10"
        >
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight text-white group-hover:text-cyan-300 transition-colors">
              {currentUser.name}
            </p>
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
