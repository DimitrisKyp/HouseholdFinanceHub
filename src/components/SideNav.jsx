"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { useTranslations } from "@/i18n/client";

// On phones only the everyday pages fit in the bar; the others (setup and settings) go under "More".
const PHONE_BAR = new Set(["/", "/transactions", "/insights", "/goals"]);

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
    href: "/categories",
    labelKey: "categories",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
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
    href: "/reminders",
    labelKey: "reminders",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3M5 11h14M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm4 10l2 2 4-4"
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
];

const isActivePath = (pathname, href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function NavIcon({ icon, active }) {
  return (
    <span
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all ${
        active ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-white/0 group-hover:border-white/30"
      }`}
    >
      {icon}
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

export default function SideNav() {
  const pathname = usePathname();
  const t = useTranslations("common");
  const items = navItems.map(item => ({ ...item, label: t(`nav.${item.labelKey}`) }));

  return (
    <nav className="relative h-full rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/30 md:h-auto md:w-20">
      <div className="relative z-10 flex h-full flex-row items-center justify-around gap-1 md:flex-col md:justify-center md:gap-3">
        {items.map(({ href, label, icon }) => {
          const isActive = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={`group min-w-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all ${
                PHONE_BAR.has(href) ? "flex" : "hidden md:flex"
              } ${isActive ? "text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
            >
              <NavIcon icon={icon} active={isActive} />
              <span className="text-[10px] leading-none font-medium md:text-[11px]">{label}</span>
            </Link>
          );
        })}
        <MoreMenu items={items.filter(item => !PHONE_BAR.has(item.href))} pathname={pathname} label={t("nav.more")} />
      </div>
    </nav>
  );
}
