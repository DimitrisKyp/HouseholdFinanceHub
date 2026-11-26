// Who is making the request, for rate limits. Behind Coolify's proxy the client address is the
// first entry of X-Forwarded-For; without a proxy (local development) there is none.
import "server-only";
import { headers } from "next/headers";

export async function clientIp() {
  const all = await headers();
  return all.get("x-forwarded-for")?.split(",")[0].trim() || all.get("x-real-ip") || "local";
}
