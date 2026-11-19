// Shell for the logged-in app: side navigation around the page.
import LiveUpdates from "@/components/LiveUpdates";
import SideNav from "@/components/SideNav";
import { getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { unreadNotificationCount } from "@/lib/notifications";

// Signed-in pages are private: keep them out of search results.
export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }) {
  // Redirects to /sign-in (no valid session) or /onboarding (no household).
  const { user, householdId } = await requireHousehold();
  const unreadCount = await unreadNotificationCount(user.id, householdId);
  const t = await getTranslations("common");

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* First thing a keyboard user reaches: jump past the navigation. */}
      <a
        href="#content"
        className="bg-accent text-on-accent sr-only z-50 rounded-full px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <aside className="shrink-0 md:w-25">
        <div className="h-full md:py-28 md:pr-0 md:pl-6">
          <SideNav unreadCount={unreadCount} />
        </div>
      </aside>
      <section id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden outline-none">
        {children}
      </section>
      <LiveUpdates />
    </div>
  );
}
