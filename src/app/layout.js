import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Household Finance Hub",
  description: "A finance dashboard, expense tracker, and family manager",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden flex flex-col bg-slate-950 text-white">
        <div className="flex h-full flex-col">
          <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Household Finance Hub</p>
                <p className="mt-1 text-sm text-slate-400">Your finance workspace</p>
              </div>
              <nav className="flex items-center gap-2 text-sm font-medium">
                <Link className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-cyan-400/40 hover:text-white" href="/">
                  Dashboard
                </Link>
                <Link className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-cyan-400/40 hover:text-white" href="/budget">
                  Budget
                </Link>
                <Link className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-cyan-400/40 hover:text-white" href="/goals">
                  Goals
                </Link>
                <Link className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-cyan-400/40 hover:text-white" href="/members">
                  Members
                </Link>
              </nav>
            </div>
          </header>
          <Providers>
            <div className="flex-1 overflow-hidden">{children}</div>
          </Providers>
        </div>
      </body>
    </html>
  );
}
