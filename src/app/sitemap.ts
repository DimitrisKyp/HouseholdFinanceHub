// /sitemap.xml: the public pages.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/sign-in", "/sign-up"].map(path => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency: "yearly",
    priority: path === "/sign-up" ? 1 : 0.8,
  }));
}
