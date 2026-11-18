"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UNREAD_CHANGED_EVENT } from "@/lib/unread-signal";

const NOTIFICATIONS_HREF = "/notifications";
const UNREAD_POLL_MS = 60_000;

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/budget",
    label: "Budget",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    href: "/members",
    label: "Members",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: NOTIFICATIONS_HREF,
    label: "Alerts",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

/**
 * The unread notification count. Starts from the server's count and asks again after each
 * navigation, when the window regains focus, when a form signals a change (see lib/unread-signal.js),
 * and every minute while the page is visible.
 */
function useUnreadCount(initial, pathname) {
  const [unread, setUnread] = useState(initial);
  // A fresh count from the server (e.g. after "Mark all as read") replaces the local one.
  const [serverCount, setServerCount] = useState(initial);
  if (initial !== serverCount) {
    setServerCount(initial);
    setUnread(initial);
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (response.ok && !cancelled) setUnread((await response.json()).unread);
      } catch {
        // Offline or the server is restarting: keep the last count.
      }
    };
    load();
    const timer = setInterval(load, UNREAD_POLL_MS);
    window.addEventListener("focus", load);
    window.addEventListener(UNREAD_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener(UNREAD_CHANGED_EVENT, load);
    };
  }, [pathname]);

  return unread;
}

export default function SideNav({ unreadCount = 0 }) {
  const pathname = usePathname();
  const unread = useUnreadCount(unreadCount, pathname);

  return (
    <nav className="relative h-full rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/30">
      <div className="relative z-10 flex h-full flex-row items-center justify-center gap-2 md:flex-col md:justify-center md:gap-3">
        {navItems.map(({ href, label, icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const badge = href === NOTIFICATIONS_HREF && unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null;
          return (
            <Link
              key={href}
              href={href}
              title={badge ? `${label}: ${unread} unread` : label}
              aria-label={badge ? `${label}, ${unread} unread` : undefined}
              className={`group flex min-w-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all ${
                isActive ? "text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-md border transition-all ${
                  isActive ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-white/0 group-hover:border-white/30"
                }`}
              >
                {icon}
                {badge ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] leading-4 font-semibold text-white"
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] leading-none font-medium md:text-[11px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
