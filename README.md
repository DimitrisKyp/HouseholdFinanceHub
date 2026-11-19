# Household Finance Hub

A household finance app: track expenses, budgets and savings goals, and share them with the
people you live with. Built with [Next.js](https://nextjs.org), PostgreSQL and
[Drizzle ORM](https://orm.drizzle.team).

## How the code is organised

- **Server pages are the containers.** Each `src/app/(app)/*/page.js` checks access through the Data
  Access Layer (`src/lib/dal.js`), loads data with the queries in `src/lib/finance.js` and friends, and
  turns it into ready-to-show labels (money, dates) with the pure functions in `src/lib`.
- **Presentational components** in `src/components` receive those labels as props and only render
  (e.g. `RecentExpenses`, `NotificationList`, `ToastStack`, the charts).
- **Client containers** hold browser state and wire it to presentational parts: e.g.
  `ExpenseTrackerPanel` (form + optimistic list), `LiveUpdates` (live connection + messages), `SideNav`.
- **Custom hooks** in `src/hooks` keep that logic reusable and testable on its own:
  `useLiveUpdates`, `useUnreadCount`, `usePendingExpenses` (optimistic UI), `useDismiss`.
- **Server Actions** in `src/lib/actions` change data; each one checks permissions itself.

## Languages

The app is in English and Greek. Each person picks a language on the Account page (saved to their
account and a cookie, like the theme); visitors who haven't chosen get their browser's language, and
the sign-in pages have a language switch.

- **Messages** are in `src/i18n/messages/<language>/<area>.json`, one file per area of the app. Every
  message must exist in both languages with the same `{placeholders}`: a unit test checks this.
- **Server Components and Server Actions** translate with `const t = await getTranslations("budget")`
  (`src/i18n/server.js`). **Client Components** use `useTranslations("budget")` and `useLocale()`
  (`src/i18n/client.jsx`).
- **A page sends the browser only the messages its Client Components need**: wrap it in
  `<Messages namespaces={["budget"]}>` (`src/i18n/MessagesProvider.jsx`). The root layout already
  provides `common` and `errors`. A missing message shows as `budget.someKey` on the page.
- **Amounts and dates** follow the language: pass the locale to `formatMoney`, `formatDay` and
  `formatMonth` (`1.250,50 €` and `18 Νοε 2026` in Greek).
- **Notifications and live messages** store their values, not finished sentences, so each person
  reads them in their own language.
- **Adding a language:** add it to `LOCALES` in `src/i18n/config.js` (with its date and number
  locales), copy `messages/en` to `messages/<language>`, translate, and add the files to
  `messages/index.js` and to the check constraint on `user_preference.locale`.

## Requirements

- [Node.js](https://nodejs.org) 26 (LTS), the version in `.nvmrc`
- [PostgreSQL 17](https://www.postgresql.org/download/) installed (only its programs are used;
  the project runs its own private database server, so no admin password is needed)
- Optional: [pgAdmin 4](https://www.pgadmin.org) to browse the database

The scripts expect PostgreSQL in `C:\Program Files\PostgreSQL\17\bin`. If yours is elsewhere,
set the `PG_BIN` environment variable to its `bin` folder.

## First-time setup

```bash
npm install          # install dependencies
npm run db:init      # create the local database server, user and database (once per computer)
npm run db:migrate   # create the tables
```

`db:init` does the following:

- Creates a PostgreSQL server for this project in
  `%LOCALAPPDATA%\household-finance-hub\pgdata`, listening on **localhost:5433**.
- Generates passwords and writes `DATABASE_URL` to `.env.local`, which is never committed.
- Saves the database admin (`postgres`) password in
  `%LOCALAPPDATA%\household-finance-hub\postgres-superuser-password.txt`.

Every setting the app reads is listed, with what it's for, in [`.env.example`](.env.example). Copy the
ones you need into `.env.local` (development) or set them in Coolify (production).

## Starting the app (every day)

```bash
npm run db:start     # start the database (needed after every computer restart)
npm run dev          # start the website
```

Open [http://localhost:3000](http://localhost:3000).

The first time, choose **Create an account**. Signing up creates your household and makes you
its **owner**. Every page except sign-in and sign-up requires you to be signed in.

New accounts must **confirm their email** before they can sign in. Locally, no email is really
sent: the email, including the confirmation link, is printed in the terminal running
`npm run dev`. Ctrl+click the link to open it. Accounts created before email confirmation was
added aren't confirmed yet. Sign in once, and a fresh link appears in the terminal.

- **Forgot your password?** Use the link on the sign-in page. The reset link (in the terminal
  locally) works once, for 1 hour, and signs you out on every device.
- **Change your password** on the **Account** page (side menu, or click your name).
- **Invite household members** on the **Members** page (owner only). They get an email link
  (7 days, single use), choose their own password and join as **Editor** or **Viewer**.
  Locally, the invite link appears in the terminal.

## Running the app on nestestia.com from your PC

A temporary setup for development and personal use, until the app has a real server (see TODO.md,
"Deployment checklist"). Nothing is installed on the PC: VS Code's built-in port forwarding makes
the app reachable, and a free Cloudflare Worker in front of `nestestia.com` passes visits to it. When
the PC, VS Code or the app is off, the Worker shows an "offline" page in English and Greek instead.

```
browser → nestestia.com (Cloudflare Worker) → VS Code tunnel (*.devtunnels.ms) → npm start on your PC
```

### One-time setup

1. **Cloudflare account** (free plan) at cloudflare.com: **Add a domain** → `nestestia.com`. Cloudflare
   shows two name servers. At papaki.com, open the domain's **Name servers** and replace papaki's
   with Cloudflare's. The domain stays registered at papaki; DNS (including the email records for
   Resend) is now managed in Cloudflare. The switch can take a few hours.
2. **Public address of the app**: create `.env.production.local` (git-ignored, read only by
   `npm run build` and `npm start`, not by `npm run dev`) with:
   ```
   BETTER_AUTH_URL=https://nestestia.com
   ```
   Add `SMTP_URL` and `EMAIL_FROM` there too once email is set up (see [Email](#email)). Until then
   the app sends no emails in this mode, so invitations and password resets won't arrive; signing
   in with an existing, confirmed account works. It uses the database from `.env.local`.
3. **Forward the port** once to get the tunnel address: start the app (below), then in VS Code open
   the **Ports** panel (next to Terminal) → **Forward a Port** → `3000`. Right-click it →
   **Port Visibility** → **Public**. Copy the **Forwarded Address**, e.g.
   `https://abc123-3000.euw.devtunnels.ms`. VS Code asks you to sign in with GitHub the first time.
4. **The Worker**: in Cloudflare, **Workers & Pages** → **Create** → **Hello World** worker, name it
   e.g. `nestestia`, **Deploy**, then **Edit code**. Replace the code with the whole of
   [`deploy/cloudflare-worker.js`](deploy/cloudflare-worker.js) and **Deploy**. Then in the Worker:
   - **Settings → Variables and Secrets → Add**: `TUNNEL_URL` = the forwarded address from step 3.
   - **Settings → Domains & Routes → Add → Custom domain**: `nestestia.com`, and again for
     `www.nestestia.com` (the Worker redirects www to the bare domain).
5. **Keep it private** (recommended, since this is for personal use): Cloudflare **Zero Trust**
   (free up to 50 people) → **Access → Applications → Add → Self-hosted**, domain `nestestia.com`,
   with a policy **Allow** → **Emails** → your own address(es). Visitors then have to enter a code
   sent to an allowed email before they see anything, even the sign-in page.

### Every time you want the site online

```bash
npm run db:start
npm run build        # again after code changes, and after the browser tests (they rebuild it)
npm start
```

Then make sure VS Code's **Ports** panel shows port 3000 forwarded, and open https://nestestia.com.
Close it with Ctrl+C (or close VS Code), and the site shows "Currently offline".

- **Use https://nestestia.com, not localhost**, while running this way: sign-in only accepts the
  address in `BETTER_AUTH_URL`. For everyday development keep using `npm run dev` and localhost.
- **If the forwarded address changes** (VS Code gives a new one), update `TUNNEL_URL` in the Worker.
- **How the Worker spots the app**: every app response carries the header `x-household-app`
  (`next.config.mjs`). Anything else (no answer, or the tunnel's own error page) means offline.
- The tunnel address itself is public too, but hard to guess, and every page still needs a sign-in.
- **Moving to a real server later**: delete the Worker's custom domains (or the Worker), point
  `nestestia.com` at the server, and delete `.env.production.local`.

## Email

| Variable     | What it does                                                                       |
| ------------ | ---------------------------------------------------------------------------------- |
| `SMTP_URL`   | Mail server to send through, e.g. `smtps://user:password@smtp.example.com:465`     |
| `EMAIL_FROM` | Sender shown to recipients, e.g. `Household Finance Hub <no-reply@yourdomain.com>` |

- **Without `SMTP_URL`** (local development): emails are printed in the `npm run dev` terminal.
- **In production `SMTP_URL` is required.** The app refuses to print emails there, so links
  never end up in server logs. Any SMTP provider works (Resend, Brevo, Postmark, your mail host).
  Most providers have a free tier, but they need you to verify your domain first.
- To see emails as a real inbox locally, run [Mailpit](https://mailpit.axllent.org) (one
  program, no install or admin rights needed). Then add `SMTP_URL=smtp://localhost:1025` to
  `.env.local` and open http://localhost:8025.
- If a password in `SMTP_URL` contains special characters (`@`, `:`, `/`, `#`), URL-encode them.
- **"self-signed certificate in certificate chain" when sending** means antivirus or a company network
  is inspecting the mail connection (e.g. Kaspersky does this on ports 465 and 587). Resend also
  listens on **2465** (SSL) and **2587** (STARTTLS), which such tools usually leave alone:
  `SMTP_URL=smtps://resend:<API key>@smtp.resend.com:2465`.

`.env.local` also holds `BETTER_AUTH_SECRET` (signs login sessions; keep it secret, and use a
different one in production) and `BETTER_AUTH_URL` (the site's address, `http://localhost:3000`
locally).

If the app shows `ECONNREFUSED ... 5433` errors, the database isn't running. Run
`npm run db:start`.

## Market data on the dashboard

The "Markets & news" panel uses public services that need no API key: ECB exchange rates through
[Frankfurter](https://frankfurter.dev) and the BBC News Business RSS feed. Answers are cached on the
server for 15 minutes (`MARKET_CACHE_SECONDS`); if a refresh fails, the last good copy is shown and
marked as not up to date. To use other sources, set `RATES_API_URL`, `NEWS_FEED_URL` and
`NEWS_SOURCE_NAME`. The browser tests use a local stand-in (`e2e/market-stub.mjs`) instead.

On a network that inspects HTTPS with its own certificate (common on company networks), Node.js
rejects the connection and the panel says it couldn't load. Node has to be told to trust Windows'
certificates **before it starts**, so this goes in your Windows user environment, not in `.env.local`:
with Node.js 22.15 or newer, run `setx NODE_OPTIONS "--use-system-ca"` once and open a new terminal.
(On older Node.js, export the company root certificate and point `NODE_EXTRA_CA_CERTS` at the file instead.)

## Database commands

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run db:start`     | Start the local database server                             |
| `npm run db:stop`      | Stop it                                                     |
| `npm run db:status`    | Show whether it is running                                  |
| `npm run db:migrate`   | Apply new migrations (run after pulling schema changes)     |
| `npm run db:generate`  | After editing `src/db/schema/`, create a new migration file |
| `npm run db:studio`    | Browse and edit data in the browser (Drizzle Studio)        |
| `npm run db:init-test` | Create the separate database the browser tests use (once)   |

See [schema.md](schema.md) for the tables and the permission rules.

## Tests

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `npm test`           | Unit and component tests (Vitest), a few seconds, no database needed |
| `npm run test:watch` | The same, re-running as you edit                                     |
| `npm run test:e2e`   | Browser tests (Playwright) of the main user flows, about 2 minutes   |

The browser tests build the app, start it on port 3100 and use it like a person would, signed in
as an owner, an editor and a viewer. They use their own database, `household_finance_test`, and
wipe it on every run, so your own data is never touched. Before the first run:

```bash
npm run db:start      # if it isn't running
npm run db:init-test  # once: creates the test database and adds TEST_DATABASE_URL to .env.local
```

- Tests live in `e2e/`. Each file starts from a fresh test household (`e2e/helpers/db.mjs`).
- Locally they run in Microsoft Edge. To use Playwright's own Chromium instead, run
  `npx playwright install chromium` and set `E2E_BROWSER_CHANNEL=chromium`.
- After a failure, `npx playwright show-report` opens the report with screenshots and a
  step-by-step trace of each failed test.
- CI runs all of them on every push and pull request (`.github/workflows/ci.yml`).

## Viewing the database in pgAdmin 4

1. Make sure the database is running: `npm run db:status`. If it isn't, run `npm run db:start`.
2. In pgAdmin, right-click **Servers** → **Register** → **Server...**
3. **General** tab: **Name** `Household Finance Hub (local)`
4. **Connection** tab:
   | Field | Value |
   | -------------------- | ------------------------------------------------------------------ |
   | Host name/address | `localhost` |
   | Port | `5433` |
   | Maintenance database | `postgres` |
   | Username | `postgres` |
   | Password | contents of `%LOCALAPPDATA%\household-finance-hub\postgres-superuser-password.txt` |
   | Save password? | on |
5. Click **Save**.
6. Browse to **Household Finance Hub (local)** → **Databases** → **household_finance_hub** →
   **Schemas** → **public** → **Tables**.
   - To see rows, right-click a table → **View/Edit Data** → **All Rows**.
   - To write SQL, select the database, then **Tools** → **Query Tool**.

Notes:

- Port **5433** is this project's server. A PostgreSQL on port 5432 is a different server
  (for example one installed by IT) and doesn't contain this project's data.
- `postgres` is the admin account, so pgAdmin lets you change anything. Be careful when editing
  or deleting rows by hand.
- Change tables through Drizzle (`src/db/schema/` → `db:generate` → `db:migrate`), not in
  pgAdmin. Otherwise the migration history and the real database drift apart.
- The `drizzle` schema holds the migration history. Don't edit it.
