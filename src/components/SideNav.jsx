"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useTranslations } from "@/i18n/client";

const NOTIFICATIONS_HREF = "/notifications";

// On phones only the everyday pages fit in the bar; the others (setup and settings) go under "More".
const PHONE_BAR = new Set(["/", "/transactions", "/insights", "/goals", NOTIFICATIONS_HREF]);

const navItems = [
  {
    href: "/",
    labelKey: "dashboard",
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
    labelKey: "budget",
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
    labelKey: "transactions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "/insights",
    labelKey: "insights",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
      </svg>
    ),
  },
  {
    href: "/goals",
    labelKey: "goals",
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
    labelKey: "members",
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
    labelKey: "alerts",
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
    labelKey: "account",
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

const isActivePath = (pathname, href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function NavIcon({ icon, active, badge }) {
  return (
    <span
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all ${
        active ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-white/0 group-hover:border-white/30"
      }`}
    >
      {icon}
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] leading-4 font-semibold text-white"
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}

const MORE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
  </svg>
);

/** Phones only: the pages that don't fit in the bar, in a menu. Closes on navigation, Escape or a click outside. */
function MoreMenu({ items, pathname, label }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const menuId = useId();
  const wrapper = useRef(null);
  if (open && openedAt !== pathname) setOpen(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, { containerRef: wrapper });

  const active = items.some(item => isActivePath(pathname, item.href));
  return (
    <div ref={wrapper} className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(value => !value);
        }}
        className={`group flex flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all ${
          active || open ? "text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <NavIcon icon={MORE_ICON} active={active} />
        <span className="text-[10px] leading-none font-medium">{label}</span>
      </button>
      {open ? (
        <ul
          id={menuId}
          className="absolute top-full right-0 z-30 mt-2 w-44 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl shadow-black/50"
        >
          {items.map(({ href, label, icon }) => {
            const itemActive = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={itemActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition ${
                    itemActive ? "text-cyan-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <NavIcon icon={icon} active={itemActive} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function SideNav({ unreadCount = 0 }) {
  const pathname = usePathname();
  const unread = useUnreadCount(unreadCount, pathname);
  const t = useTranslations("common");
  const items = navItems.map(item => ({ ...item, label: t(`nav.${item.labelKey}`) }));

  return (
    <nav className="relative h-full rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/30">
      <div className="relative z-10 flex h-full flex-row items-center justify-around gap-1 md:flex-col md:justify-center md:gap-3">
        {items.map(({ href, label, icon }) => {
          const isActive = isActivePath(pathname, href);
          const badge = href === NOTIFICATIONS_HREF && unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null;
          return (
            <Link
              key={href}
              href={href}
              title={badge ? t("nav.unreadTitle", { label, count: unread }) : label}
              aria-label={badge ? t("nav.unreadLabel", { label, count: unread }) : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`group min-w-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all ${
                PHONE_BAR.has(href) ? "flex" : "hidden md:flex"
              } ${isActive ? "text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
            >
              <NavIcon icon={icon} active={isActive} badge={badge} />
              <span className="text-[10px] leading-none font-medium md:text-[11px]">{label}</span>
            </Link>
          );
        })}
        <MoreMenu items={items.filter(item => !PHONE_BAR.has(item.href))} pathname={pathname} label={t("nav.more")} />
      </div>
    </nav>
  );
}
