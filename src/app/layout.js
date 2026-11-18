import { Geist, Geist_Mono } from "next/font/google";
import WebVitals from "@/components/WebVitals";
import { currentTheme } from "@/lib/preferences";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, locale: "en_IE" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default async function RootLayout({ children }) {
  // The theme comes from a cookie (set on the Account page), so it applies before anything loads.
  const theme = await currentTheme();
  return (
    <html lang="en" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-slate-950 text-white">
        <WebVitals />
        <div className="h-full" style={{ backgroundImage: "var(--page-gradient)" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
