// Shell for the logged-in app: side navigation + Redux store seeded with the real user.
import SideNav from "@/components/SideNav";
import { requireHousehold } from "@/lib/dal";
import ReduxStoreProvider from "@/providers/ReduxStoreProvider";

export default async function AppLayout({ children }) {
  // Redirects to /sign-in (no valid session) or /onboarding (no household).
  const { user, householdName, role } = await requireHousehold();

  // Only the fields the UI needs are sent to the browser.
  const currentUser = {
    name: user.name,
    email: user.email,
    jobTitle: user.jobTitle ?? "",
    avatarUrl: user.image ?? null,
    role,
    householdName,
  };

  return (
    <ReduxStoreProvider currentUser={currentUser}>
      <div className="flex h-full flex-col md:flex-row">
        <aside className="shrink-0 md:w-25">
          <div className="h-full md:py-28 md:pr-0 md:pl-6">
            <SideNav />
          </div>
        </aside>
        <section className="min-h-0 flex-1 overflow-hidden">{children}</section>
      </div>
    </ReduxStoreProvider>
  );
}
