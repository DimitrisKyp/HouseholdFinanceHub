import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-slate-950 text-white">
        <Providers>
          <div className="flex h-full flex-col md:flex-row  bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)]">
            <aside className="shrink-0 md:w-25">
              <div className="h-full p-2 md:p-3">
                <SideNav />
              </div>
            </aside>
            <section className="min-h-0 flex-1 overflow-hidden">{children}</section>
          </div>
        </Providers>
      </body>
    </html>
  );
}
