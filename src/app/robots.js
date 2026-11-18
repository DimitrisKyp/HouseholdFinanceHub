// /robots.txt: only the sign-in and sign-up pages are public; everything else needs an account.
import { SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: ["/sign-in", "/sign-up"], disallow: "/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
