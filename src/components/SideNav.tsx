"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { useTranslations } from "@/i18n/client";

// labelKey is a key under common.nav.* in the messages.
const navItems: { href: string; labelKey: string; icon: ReactNode }[] = [
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

const isActivePath = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function NavIcon({ icon, active }: { icon: ReactNode; active: boolean }) {
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

const BURGER_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CLOSE_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const roundButton =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-cyan-400/40 hover:text-white";

function useNavItems() {
  const t = useTranslations("common");
  return navItems.map(item => ({ ...item, label: t(`nav.${item.labelKey}`) }));
}

/**
 * Phones only: a burger button (left of the top bar) that opens every page in a drawer from the
 * left. Closes on navigation, Escape or a tap outside; Tab stays inside the drawer while open.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("common");
  const items = useNavItems();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const drawerId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  if (open && openedAt !== pathname) setOpen(false);

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);
  useDismiss(open, close, { containerRef: panel });

  useEffect(() => {
    if (!open) return undefined;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel.current) return;
      // The generic says what the selector finds, so first/last have .focus().
      const focusable = panel.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        aria-label={t("nav.menu")}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
        className={roundButton}
      >
        {BURGER_ICON}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
          <div
            ref={panel}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-slate-900 p-3 shadow-2xl shadow-black/50"
          >
            <div className="mb-3 flex justify-end">
              <button ref={closeButton} type="button" aria-label={t("nav.closeMenu")} onClick={close} className={roundButton}>
                {CLOSE_ICON}
              </button>
            </div>
            <nav aria-label={t("nav.label")} className="min-h-0 flex-1 overflow-y-auto">
              <ul className="space-y-1">
                {items.map(({ href, label, icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition ${
                          active ? "bg-cyan-400/5 text-cyan-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <NavIcon icon={icon} active={active} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** From md up: the column of pages beside the content. Phones use MobileNav instead. */
export default function SideNav() {
  const pathname = usePathname();
  const t = useTranslations("common");
  const items = useNavItems();

  return (
    <nav aria-label={t("nav.label")} className="relative w-20 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/30">
      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        {items.map(({ href, label, icon }) => {
          const isActive = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={`group flex min-w-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center transition-all ${
                isActive ? "text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <NavIcon icon={icon} active={isActive} />
              <span className="text-[11px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
