# Household Hub TODO

## Deployment checklist

Live at https://nestestia.com on Vercel + Supabase (README, "Hosting on Vercel + Supabase"). The
items below are for the move to a real server later (VPS + Coolify + own domain).

- [ ] Make the first backup (README, "Backups"), then one now and then: free Supabase has none.

### Must do before going live

- [ ] **On the real server, set `SMTP_URL` and `EMAIL_FROM` in Coolify** (port 465 is fine there).
      Without `SMTP_URL`, production sends no emails at all, so nobody can confirm their account or
      reset a password.
- [ ] **New `BETTER_AUTH_SECRET`** for production. Don't reuse the one in `.env.local`. Generate
      it with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- [ ] **`BETTER_AUTH_URL`** = the real `https://` address. Links in emails are built from it.
      If both `www.` and the bare domain work, redirect one to the other, or add the second to
      `trustedOrigins` in `src/lib/auth.ts`.
- [ ] **Production database:** a PostgreSQL in Coolify, with `DATABASE_URL` pointing to it.
      Run `npm run db:migrate` on every deploy, before the new version starts.
- [ ] **Database backups:** turn on scheduled backups in Coolify and test restoring one once.
- [ ] **HTTPS only.** Coolify handles certificates. Login cookies are only marked `Secure`
      when the site is served over https.

### Server setup

- [ ] After the first deploy, check that Coolify's build log shows Node 26. If it doesn't, set
      the app's environment variable `NIXPACKS_NODE_VERSION=26` in Coolify.
- [ ] `scripts/local-db.mts` and the `db:init/start/stop/status` commands are for local
      development only. Don't use them on the server.

- [ ] **Live updates need a direct database connection** for `LISTEN` (`src/lib/live.ts`). If a
      connection pooler such as PgBouncer is ever put in front of PostgreSQL, it must not be in
      transaction mode for this app, or set `LIVE_DATABASE_URL` to a direct (or session mode)
      address: `live.ts` uses it for its listening connection.
- [ ] **Don't buffer `/api/events`** in the reverse proxy (Server-Sent Events). Coolify's Traefik
      streams by default; the route also sends `X-Accel-Buffering: no` for nginx. If a proxy
      closes idle connections sooner than every 25 s (the heartbeat), raise its timeout.

- [ ] **Outbound HTTPS** from the server to `api.frankfurter.dev` and `feeds.bbci.co.uk` (Markets &
      news panel). If the server can't reach them, the panel says so and the rest of the dashboard works.
- [ ] **Logs:** analytics and errors are JSON lines in the app's output (`"event":"server_error"`,
      `"page_view"`, `"web_vital"`, `"client_error"`). Keep Coolify's log retention long enough to
      look back, or forward them (e.g. to Sentry for errors, Plausible for visits) from `src/lib/telemetry.ts`.

### Fine for one server, revisit if the app grows

- [ ] The limit of one email per address per minute and the sign-in / password attempt limits
      (`src/lib/throttle.ts`) are kept in server memory. It resets on restart and isn't shared if the app ever runs on more than one server.
      Move it to Redis or the database then.

### Later features that depend on deployment

- [ ] On the real server, schedule the daily reminders job (README, "Reminders"): a cron task in
      Coolify calling `/api/cron/reminders` with `CRON_SECRET`.
- [ ] If profile pictures from other sites are allowed, add their hosts to `images.remotePatterns`
      in `next.config.mts` (otherwise `next/image` throws an error).
