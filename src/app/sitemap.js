// /sitemap.xml: the public pages.
import { SITE_URL } from "@/lib/site";

export default function sitemap() {
  return ["/sign-in", "/sign-up"].map(path => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency: "yearly",
    priority: path === "/sign-up" ? 1 : 0.8,
  }));
}
