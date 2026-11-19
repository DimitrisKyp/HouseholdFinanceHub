# Frontend Portfolio TODO (Next.js App Router)

## 1 Understand and apply Next.js structure

- [x] Keep routes in src/app with file conventions:
  - page.js: route UI
  - layout.js: shared wrapper
  - loading.js: suspense fallback
  - error.js: route-level error boundary
  - not-found.js: custom 404 per segment
  - route.js: API handlers
- [x] Use route folders for URL segments and dynamic folders like [id].
- [x] Keep reusable UI in src/components and state logic in src/lib.
- [x] Keep static files in public.
- [x] Build a shared app shell with a sticky header and an internal scroll area.
- [x] Move household members management to its own route (/members).

## 2 Component architecture and logic separation

- [x] Split homepage into focused JSX components:
  - src/components/home/HeroSection.jsx
  - src/components/home/BudgetSetupPanel.jsx
  - src/components/home/ExpenseTrackerPanel.jsx
  - src/components/home/FinancialNewsPanel.jsx
  - src/components/home/GoalsRemindersPanel.jsx
  - src/components/home/Panel.jsx
- [x] Move the household members register to a dedicated members route.
- [x] Move complex client logic into custom hooks (`src/hooks`: useLiveUpdates, useUnreadCount, usePendingExpenses, useDismiss). Computed figures stay in pure `src/lib` functions run on the server.
- [x] Add presentational vs container pattern for larger features (server pages and client containers own data and state; e.g. RecentExpenses, NotificationList, ToastStack only render). Described in the README.

## 3 Dashboard depth (showcase UI and state skills)

- [x] Add filters: date range, category, household member.
- [x] Add searchable and sortable transactions table.
- [x] Add charts (monthly trend, category breakdown as ranked bars instead of a pie, left over per month) on /insights.
- [x] Savings forecast on /goals and /insights: expected monthly left-over, what the goals will hold in 6/12 months at their recent pace, what goals need, and a projected date per goal. Fixed bills logged as expenses are not counted twice.
- [x] Add pagination or virtualized list for transactions.

## 4 Design system and UX polish

- [x] Create shared UI primitives in `src/components/ui`: Button (+ `buttonClasses` for links), Field (TextField, SelectField, form messages), Card, Badge, Modal (native `<dialog>`), Skeleton.
- [x] Define design tokens in CSS variables (`globals.css`): semantic colours (accent, ink, surface, line), focus ring, chart colours, radii, page gradient.
- [x] Add theme support (system / dark / light), saved per user (`user_preference`) and in a cookie so pages render in it from the first byte; chart colours validated for both themes.
- [x] Improve accessibility: axe-core WCAG 2.1 A/AA checks on every page in both themes (`e2e/accessibility.spec.mjs`), skip link, visible focus ring, reduced motion, modal dialog via `<dialog>`, contrast fixes.

## 5 API integration quality

- [x] Integrate real market/news data without API keys: ECB exchange rates (Frankfurter API) for the household currency with the week's change, and business headlines from an RSS feed (BBC News Business). Sources can be changed with `RATES_API_URL` / `NEWS_FEED_URL`.
- [x] Add loading, empty, error, and retry states: the Markets & news panel streams in a Suspense boundary (skeleton), each half shows empty / failed ("Try again") states, and a failing service never blocks the dashboard. Pages keep their route-level loading skeleton and error boundary with retry.
- [x] Add caching strategy and stale-data indicators: in-memory cache (`src/lib/cache.js`, 15 min by default), last good copy served when a refresh fails, shown as "Not up to date: couldn't refresh, showing … from 14:05"; "Updated 14:05" otherwise.
- [x] Add skeleton loading components (`ui/Skeleton`, used by the Markets panel while it loads).

## 6 Auth and permissions

- [x] Add authentication flow (sign in/sign up/sign out).
- [x] Add protected routes and role-based views (owner, editor, viewer).
- [x] Show permission-aware UI controls (disable/hide actions by role).
- [x] Store budget, expenses and goals in PostgreSQL (replaced the Redux demo data).

## 7 Real-time and collaboration

- [x] Add live expense updates: Server-Sent Events (`/api/events`) fed by PostgreSQL LISTEN/NOTIFY. Other open pages refresh with a short message when someone changes expenses, the budget, goals or members; the unread badge updates instantly; a removed member loses access at once.
- [x] Add notification center for invites and budget alerts (/notifications, with an unread badge in the navigation): budget alerts at 80%/100% of a category limit, goals reached, members joining, role changes.
- [x] Add optimistic UI for invite and expense creation (`useOptimistic`): a new expense shows in the dashboard's "Recent this month" list marked "Saving…", a new invitation as "Sending…"; both disappear again if the server refuses.

## 8 Testing and quality gates

- [x] Add unit tests for utility formatters and calculations (Vitest, `npm test`).
- [x] Add component tests for forms and list rendering (Testing Library).
- [x] Add integration tests for key user flows (Playwright against a test database, `npm run test:e2e`; run in CI with a Postgres service).
- [x] Add CI checks: lint, test, build (`.github/workflows/ci.yml`).
- [x] Add `npm run format:check` to CI (all files formatted; generated drizzle snapshots are ignored).

## 9 Performance and production readiness

- [x] Use dynamic imports: the Insights charts load in their own chunk (`LazyColumnChart`, `next/dynamic`), and the dashboard's breakdown drawer only downloads when first opened.
- [x] Measure bundle size: `npm run analyze` (Turbopack bundle analyzer) and a budget test (`e2e/performance.spec.mjs`) that fails if a page downloads more than 200 KB of compressed JavaScript on a first visit (now about 165–175 KB, mostly React and Next.js). Data loading and formatting stay in Server Components.
- [x] Add metadata (description, Open Graph, Twitter card, theme colour, noindex for signed-in pages), a generated OG image, `sitemap.xml`, `robots.txt`, an app icon and a web app manifest.
- [x] Add analytics and error monitoring, self-hosted: server errors (`instrumentation.js` onRequestError), browser errors, page views and Core Web Vitals (`instrumentation-client.js`, `/api/telemetry`) are written to the server log as JSON lines. No cookies, user ids or query strings.

- [x] Preferences: theme per user; currency, timezone and name per household (owner, Account page).
- [x] Language: English and Greek, chosen per user on the Account page (saved to the account and a cookie), the browser's language before that, and a switch on the sign-in pages. Messages per area in `src/i18n/messages`; amounts, dates, emails, notifications and live messages follow the reader's language. See "Languages" in the README.
- [x] Set up your profile: change your name on the Account page.

## 10 Deployment checklist (do when going live)

Things that work locally but must be done or changed on the real server
(VPS + Coolify + own domain).

- [x] **Temporary, personal use:** `nestestia.com` served from the PC through VS Code port forwarding
      and a Cloudflare Worker that shows an "offline" page when the PC is off (README, "Running the
      app on nestestia.com from your PC"; `deploy/cloudflare-worker.js`). When moving to a server:
      remove the Worker's custom domains, point the domain at the server, delete `.env.production.local`.

### Must do before going live

- [x] **Rate-limit sign-in and the other auth forms** (`src/lib/throttle.js`): failed sign-ins per
      account and per address, sign-ups, password resets and password changes are limited, with a
      "Too many attempts. Please wait N minutes" message. Behind Coolify the address comes from
      `X-Forwarded-For`, so the proxy must set it (Traefik does by default).
- [ ] **Email sending:** domain `nestestia.com` (registered and DNS at papaki.com), sent through
      **Resend** from the subdomain `mail.nestestia.com`. Verify it in Resend (SPF, DKIM and DMARC
      records added in papaki's DNS), then set
      `SMTP_URL=smtps://resend:<API key>@smtp.resend.com:465` and
      `EMAIL_FROM="Household Finance Hub <no-reply@mail.nestestia.com>"`. Without `SMTP_URL`,
      production sends no emails at all, so nobody can confirm their account or reset a password.
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

### Server setup

- [x] Node.js 26 LTS, set in one place: `.nvmrc` (read by Coolify's builders and by CI) and
      `engines.node` in `package.json`. To change the version later, edit `.nvmrc`.
- [ ] After the first deploy, check that Coolify's build log shows Node 26. If it doesn't, set
      the app's environment variable `NIXPACKS_NODE_VERSION=26` in Coolify.
- [x] Add `.env.example` listing every variable (no values), with an exception in `.gitignore`.
- [ ] `scripts/local-db.mjs` and the `db:init/start/stop/status` commands are for local
      development only. Don't use them on the server.
- [x] Rename the package from `learning-hub` in `package.json` (now `household-finance-hub`).

- [ ] **Live updates need a direct database connection** for `LISTEN` (`src/lib/live.js`). If a
      connection pooler such as PgBouncer is ever put in front of PostgreSQL, it must not be in
      transaction mode for this app, or give `live.js` its own direct connection string.
- [ ] **Don't buffer `/api/events`** in the reverse proxy (Server-Sent Events). Coolify's Traefik
      streams by default; the route also sends `X-Accel-Buffering: no` for nginx. If a proxy
      closes idle connections sooner than every 25 s (the heartbeat), raise its timeout.

- [ ] **Outbound HTTPS** from the server to `api.frankfurter.dev` and `feeds.bbci.co.uk` (Markets &
      news panel). If the server can't reach them, the panel says so and the rest of the dashboard works.
- [ ] **Logs:** analytics and errors are JSON lines in the app's output (`"event":"server_error"`,
      `"page_view"`, `"web_vital"`, `"client_error"`). Keep Coolify's log retention long enough to
      look back, or forward them (e.g. to Sentry for errors, Plausible for visits) from `src/lib/telemetry.js`.

### Fine for one server, revisit if the app grows

- [ ] The limit of one email per address per minute and the sign-in / password attempt limits
      (`src/lib/throttle.js`) are kept in server memory. It resets on restart and isn't shared if the app ever runs on more than one server.
      Move it to Redis or the database then.

### Later features that depend on deployment

- [ ] In-app budget alerts are sent when an expense is added, so they need no scheduled job.
      Reminder emails (e.g. a weekly summary, or a goal falling behind) would: a cron task in
      Coolify calling a protected route.
- [ ] If profile pictures from other sites are allowed, add their hosts to `images.remotePatterns`
      in `next.config.mjs` (otherwise `next/image` throws an error).
