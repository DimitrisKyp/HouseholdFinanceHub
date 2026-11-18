import { Geist, Geist_Mono } from "next/font/google";
import { currentTheme } from "@/lib/preferences";
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

export default async function RootLayout({ children }) {
  // The theme comes from a cookie (set on the Account page), so it applies before anything loads.
  const theme = await currentTheme();
  return (
    <html lang="en" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-slate-950 text-white">
        <div className="h-full" style={{ backgroundImage: "var(--page-gradient)" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
