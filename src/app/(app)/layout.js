// Shell for the logged-in app: side navigation beside the page, and the top bar (what's left this
// month, the date, notifications, the profile and sign-out) above every page.
import LiveUpdates from "@/components/LiveUpdates";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { monthSummary } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { unreadNotificationCount } from "@/lib/notifications";

// Signed-in pages are private: keep them out of search results.
export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }) {
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
    <div className="flex h-full flex-col md:flex-row">
      {/* First thing a keyboard user reaches: jump past the navigation. */}
      <a
        href="#content"
        className="bg-accent text-on-accent sr-only z-50 rounded-full px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <aside className="relative z-40 shrink-0 md:w-25">
        {/* Above the top bar, so the phone "More" menu opens over it. From md up: a column centred
            beside the page, as tall as its items (scrolls on very short screens). */}
        <div className="h-full md:flex md:items-center md:py-4 md:pr-0 md:pl-6">
          <SideNav />
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative z-30 shrink-0 px-3 pt-3 text-white md:px-6">
          <Messages namespaces={["notifications"]}>
            <TopBar
              balanceLabel={formatMoney(net, currency, locale)}
              balanceNegative={net < 0}
              dateLabel={dateLabel}
              unreadCount={unreadCount}
              currentUser={{ name: user.name, avatarUrl: user.image ?? null, role, householdName }}
            />
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
