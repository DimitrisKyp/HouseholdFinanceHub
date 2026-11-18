// The app's public address and how it describes itself (metadata, sitemap, share previews).
export const SITE_NAME = "Household Finance Hub";
export const SITE_DESCRIPTION =
  "Plan a household budget together: shared expenses, fixed bills, savings goals with forecasts, and alerts when a category nears its limit.";
// BETTER_AUTH_URL is the real https:// address in production (links in emails use it too).
export const SITE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
