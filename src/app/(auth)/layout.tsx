// Centered card layout for sign-in, sign-up and onboarding (no side navigation).
import LanguageSwitch from "@/components/LanguageSwitch";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-full overflow-y-auto px-4 py-10">
      <main className="m-auto w-full max-w-md">
        <p className="mb-6 text-center text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">Household Hub</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">{children}</div>
        <div className="mt-4">
          <LanguageSwitch />
        </div>
      </main>
    </div>
  );
}
