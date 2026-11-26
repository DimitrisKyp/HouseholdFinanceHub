// The daily reminders job (lib/reminder-data.ts, runDueReminders). Called once a day by a scheduler:
// Vercel Cron (vercel.json) on Vercel, or any cron that can send an HTTP request elsewhere, e.g.
//   curl -H "Authorization: Bearer $CRON_SECRET" https://nestestia.com/api/cron/reminders
// Vercel sends that header by itself when the CRON_SECRET environment variable is set.
import { timingSafeEqual } from "node:crypto";
import { runDueReminders } from "@/lib/reminder-data";

// Sending the emails can take a while with many households.
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runDueReminders();
  console.log(JSON.stringify({ event: "reminders_sent", ...result }));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
