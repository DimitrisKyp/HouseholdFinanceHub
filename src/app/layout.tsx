import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { CSSProperties } from "react";
import WebVitals from "@/components/WebVitals";
import { OG_LOCALES } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { currentTheme } from "@/lib/preferences";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist has no Greek letters. Inter fills in for those only: in the stack below it comes after
// Geist, so it's used just for characters Geist lacks, and browsers download its Greek file
// only on pages that contain Greek text.
const greek = Inter({ subsets: ["greek"], preload: false, adjustFontFallback: false, fallback: [] });
const [geistFamily, ...geistFallbacks] = geistSans.style.fontFamily.split(",").map(name => name.trim());
const textFontStack = [geistFamily, greek.style.fontFamily, ...geistFallbacks].join(", ");

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = (await getTranslations("common", locale))("siteDescription");
  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_NAME,
    description,
    applicationName: SITE_NAME,
    openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description, locale: OG_LOCALES[locale] },
    twitter: { card: "summary_large_image", title: SITE_NAME, description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The theme comes from a cookie (set on the Account page), so it applies before anything loads.
  const theme = await currentTheme();
  // The language comes from a cookie too (chosen on the Account page), or the browser's preference.
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // CSS custom properties aren't in CSSProperties, hence the cast.
      style={{ "--font-text": textFontStack } as CSSProperties}
    >
      <body className="h-full overflow-hidden bg-slate-950 text-white">
        <WebVitals />
        <Messages namespaces={["common", "errors"]}>
          <div className="h-full" style={{ backgroundImage: "var(--page-gradient)" }}>
            {children}
          </div>
        </Messages>
      </body>
    </html>
  );
}
