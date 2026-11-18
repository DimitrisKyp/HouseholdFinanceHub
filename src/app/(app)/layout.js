// Shell for the logged-in app: side navigation around the page.
import SideNav from "@/components/SideNav";
import { requireHousehold } from "@/lib/dal";

export default async function AppLayout({ children }) {
  // Redirects to /sign-in (no valid session) or /onboarding (no household).
  await requireHousehold();

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="shrink-0 md:w-25">
        <div className="h-full md:py-28 md:pr-0 md:pl-6">
          <SideNav />
        </div>
      </aside>
      <section className="min-h-0 flex-1 overflow-hidden">{children}</section>
    </div>
  );
}
