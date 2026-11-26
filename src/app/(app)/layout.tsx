// Shell for the logged-in app: side navigation beside the page, and the top bar (what's left this
// month, the date, notifications, the profile and sign-out) above every page.
import LiveUpdates from "@/components/LiveUpdates";
import SideNav, { MobileNav } from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { monthSummary } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { unreadNotificationCount } from "@/lib/notifications";
import type { Metadata } from "next";

// Signed-in pages are private: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Redirects to /sign-in (no valid session) or /onboarding (no household).
  const { user, householdId, householdName, role, currency, timezone } = await requireHousehold();
  const [t, locale, { net }, unreadCount] = await Promise.all([
    getTranslations("common"),
    getLocale(),
    monthSummary(householdId, timezone),
    unreadNotificationCount(user.id, householdId),
  ]);
  const dateLabel = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());

  return (
    <div className="flex h-full flex-row">
      {/* First thing a keyboard user reaches: jump past the navigation. */}
      <a
        href="#content"
        className="bg-accent text-on-accent sr-only z-50 rounded-full px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      {/* From md up: a column centred beside the page. Phones get the burger menu in the top bar. */}
      <aside className="relative z-40 hidden w-25 shrink-0 md:block">
        <div className="flex h-full items-center py-4 pr-0 pl-6">
          <SideNav />
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative z-30 shrink-0 px-3 pt-3 text-white md:px-6">
          <Messages namespaces={["notifications"]}>
            <div className="flex items-center gap-2">
              <MobileNav />
              <div className="min-w-0 flex-1">
                <TopBar
                  balanceLabel={formatMoney(net, currency, locale)}
                  balanceNegative={net < 0}
                  dateLabel={dateLabel}
                  unreadCount={unreadCount}
                  currentUser={{ name: user.name, avatarUrl: user.image ?? null, role, householdName }}
                />
              </div>
            </div>
          </Messages>
        </header>
        <section id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden outline-none">
          {children}
        </section>
      </div>
      <LiveUpdates />
    </div>
  );
}
