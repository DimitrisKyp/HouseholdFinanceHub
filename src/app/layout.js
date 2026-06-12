import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxStoreProvider from "@/providers/ReduxStoreProvider";
import SideNav from "@/components/SideNav";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-slate-950 text-white">
        <ReduxStoreProvider>
          <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] md:flex-row">
            <aside className="shrink-0 md:w-25">
              <div className="h-full md:pl-6 md:pr-0 md:py-28">
                <SideNav />
              </div>
            </aside>
            <section className="min-h-0 flex-1 overflow-hidden">{children}</section>
          </div>
        </ReduxStoreProvider>
      </body>
    </html>
  );
}
