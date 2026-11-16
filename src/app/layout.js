import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        <div className="h-full bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)]">{children}</div>
      </body>
    </html>
  );
}
