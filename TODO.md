# TODO: deployment and later changes

Things that work locally but must be done or changed when the app goes to a real server
(VPS + Coolify + own domain). Tick them off as they're done.

## Must do before going live

- [ ] **Rate-limit sign-in and the other auth forms.** Better Auth's built-in rate limiting
      only covers its `/api/auth/*` HTTP routes. Our forms call it from Server Actions, which
      skip it, so password guessing on the sign-in form is currently unlimited. Add a limit per
      IP and per email to `signInAction`, `signUpAction`, `changePasswordAction` and
      `resetPasswordAction` (`src/lib/actions/`).
- [ ] **Email sending:** choose an SMTP provider (Resend, Brevo, Postmark, ...), verify the domain
      (SPF, DKIM and DMARC DNS records), then set `SMTP_URL` and
      `EMAIL_FROM="Household Finance Hub <no-reply@yourdomain>"`. Without `SMTP_URL`, production
      sends no emails at all, so nobody can confirm their account or reset a password.
- [ ] **New `BETTER_AUTH_SECRET`** for production. Don't reuse the one in `.env.local`. Generate
      it with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- [ ] **`BETTER_AUTH_URL`** = the real `https://` address. Links in emails are built from it.
      If both `www.` and the bare domain work, redirect one to the other, or add the second to
      `trustedOrigins` in `src/lib/auth.js`.
- [ ] **Production database:** a PostgreSQL in Coolify, with `DATABASE_URL` pointing to it.
      Run `npm run db:migrate` on every deploy, before the new version starts.
- [ ] **Database backups:** turn on scheduled backups in Coolify and test restoring one once.
- [ ] **HTTPS only.** Coolify handles certificates. Login cookies are only marked `Secure`
      when the site is served over https.

## Server setup

- [ ] Node.js 22 or 24 LTS on the server (Node 20 is end of life).
- [ ] Add `.env.example` listing every variable (no values). `.gitignore` currently ignores
      all `.env*` files, so add an exception: `!.env.example`.
- [ ] `scripts/local-db.mjs` and the `db:init/start/stop/status` commands are for local
      development only. Don't use them on the server.
- [ ] Rename the package from `learning-hub` in `package.json`.

## Fine for one server, revisit if the app grows

- [ ] The limit of one email per address per minute (`src/lib/throttle.js`) is kept in server
      memory. It resets on restart and isn't shared if the app ever runs on more than one server.
      Move it to Redis or the database then.

## Later features that depend on deployment

- [ ] Budget alerts and reminder emails (roadmap step 5) need a scheduled job, e.g. a cron
      task in Coolify calling a protected route.
- [ ] If profile pictures from other sites are allowed, add their hosts to `images.remotePatterns`
      in `next.config.mjs` (otherwise `next/image` throws an error).
