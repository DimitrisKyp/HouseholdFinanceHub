// @ts-check
// Cloudflare Worker for nestestia.com while the app runs on a personal PC (temporary, personal use).
//
// Visitors to the domain reach the app through a VS Code port-forwarding address (TUNNEL_URL, a
// Worker variable set in the Cloudflare dashboard). When the PC is off, VS Code is closed or the app
// isn't running, they see a small "offline" page instead.
//
// How it tells the app from anything else: the app marks every response with the header below
// (see next.config.mts). An error page from the tunnel service, or no answer at all, lacks it.
// Paste this whole file into the Worker's editor in the Cloudflare dashboard: see README, "Running the
// app on nestestia.com from your PC".
// Types are JSDoc comments, so the file stays plain JavaScript that can be pasted as is.

export const APP_MARKER = "x-household-app";

const worker = {
  /**
   * @param {Request} request
   * @param {{ TUNNEL_URL?: string }} env Worker variables from the Cloudflare dashboard.
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    // One address: www.nestestia.com → nestestia.com.
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (!env.TUNNEL_URL) return offlinePage();
    const tunnel = new URL(env.TUNNEL_URL);
    const target = new URL(url.pathname + url.search, tunnel);

    const headers = new Headers(request.headers);
    // The app should see the public address, not the tunnel's.
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", "https");
    const visitor = request.headers.get("cf-connecting-ip");
    if (visitor) headers.set("x-forwarded-for", visitor);
    // VS Code tunnels show a "you are about to connect to a developer tunnel" page to browsers; skip it.
    headers.set("x-tunnel-skip-antiphishing-page", "true");

    let response;
    try {
      // `duplex` isn't in the standard RequestInit type yet, hence the JSDoc cast.
      const init = /** @type {RequestInit & { duplex: "half" }} */ ({
        method: request.method,
        headers,
        body: request.body,
        // Pass redirects to the browser instead of following them here.
        redirect: "manual",
        // Needed by Node (the unit tests) to send a streamed body; Cloudflare ignores it.
        duplex: "half",
      });
      response = await fetch(target, init);
    } catch {
      return offlinePage();
    }
    if (!response.headers.has(APP_MARKER)) return offlinePage();

    // Stream the app's answer as is (this keeps live updates working), with tunnel addresses in
    // redirects turned back into the public one.
    const out = new Response(response.body, response);
    const location = out.headers.get("location");
    if (location?.startsWith(tunnel.origin)) {
      out.headers.set("location", url.origin + location.slice(tunnel.origin.length));
    }
    return out;
  },
};

export default worker;

export function offlinePage() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
    },
  });
}

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Offline · nestestia.com</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f4ef; --card: #ffffff; --text: #1f2328; --muted: #5d6470; --accent: #b4561f; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #15171a; --card: #1e2125; --text: #eceef1; --muted: #a3aab5; --accent: #f0955a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 440px; width: 100%; background: var(--card); border-radius: 16px; padding: 36px 32px;
    box-shadow: 0 10px 30px rgb(0 0 0 / .08); text-align: center; }
  svg { width: 56px; height: 56px; color: var(--accent); }
  h1 { font-size: 1.4rem; margin: 16px 0 6px; }
  p { margin: 0; color: var(--muted); }
  hr { border: 0; border-top: 1px solid color-mix(in srgb, var(--muted) 30%, transparent); margin: 24px 0; }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>
  </svg>
  <h1>Currently offline</h1>
  <p>The app isn't available right now. Please try again later.</p>
  <hr>
  <h1 lang="el">Εκτός σύνδεσης</h1>
  <p lang="el">Η εφαρμογή δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε ξανά αργότερα.</p>
</main>
</body>
</html>`;
