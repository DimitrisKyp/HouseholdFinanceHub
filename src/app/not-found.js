import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = { title: "Page not found · Household Finance Hub" };

// Shown for unknown URLs and whenever a page calls notFound().
export default function NotFound() {
  return (
    <div className="flex h-full items-center overflow-y-auto px-4 py-10">
      <main className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold tracking-[0.35em] text-cyan-300 uppercase">404</p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className={buttonClasses({ variant: "primary", size: "sm", className: "mt-5" })}>
          Go to dashboard
        </Link>
      </main>
    </div>
  );
}
