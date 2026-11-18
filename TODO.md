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
- [ ] Move complex computed data into custom hooks (example: useBudgetStats).
- [ ] Add presentational vs container pattern for larger features.

## 3 Dashboard depth (showcase UI and state skills)

- [x] Add filters: date range, category, household member.
- [x] Add searchable and sortable transactions table.
- [x] Add charts (monthly trend, category breakdown as ranked bars instead of a pie, left over per month) on /insights.
- [ ] Savings forecast (project goal balances / monthly left-over forward).
- [x] Add pagination or virtualized list for transactions.

## 4 Design system and UX polish

- [ ] Create shared UI primitives (Button, Input, Card, Badge, Modal).
- [ ] Define design tokens in CSS variables (color, spacing, radius, shadows).
- [ ] Add theme support (light/dark) with persistence.
- [ ] Improve accessibility (labels, keyboard nav, focus styles, contrast, aria).

## 5 API integration quality

- [ ] Integrate a real API for market/news data.
- [ ] Add loading, empty, error, and retry states for each async section.
- [ ] Add caching strategy and stale-data indicators.
- [ ] Add skeleton loading components.

## 6 Auth and permissions

- [x] Add authentication flow (sign in/sign up/sign out).
- [x] Add protected routes and role-based views (owner, editor, viewer).
- [x] Show permission-aware UI controls (disable/hide actions by role).
- [x] Store budget, expenses and goals in PostgreSQL (replaced the Redux demo data).

## 7 Real-time and collaboration

- [ ] Add live expense updates (WebSocket or polling).
- [ ] Add notification center for invites and budget alerts.
- [ ] Add optimistic UI for invite and expense creation.

## 8 Testing and quality gates

- [x] Add unit tests for utility formatters and calculations (Vitest, `npm test`).
- [x] Add component tests for forms and list rendering (Testing Library).
- [x] Add integration tests for key user flows (Playwright against a test database, `npm run test:e2e`; run in CI with a Postgres service).
- [x] Add CI checks: lint, test, build (`.github/workflows/ci.yml`).
- [ ] Add `npm run format:check` to CI once the remaining files are formatted with Prettier.

## 9 Performance and production readiness

- [ ] Use dynamic imports for heavy charts.
- [ ] Measure bundle size and optimize client components.
- [ ] Add metadata, OG images, sitemap, robots.
- [ ] Add analytics and error monitoring.

- preferences per profile currency/language/theme 
- setup profile 

## 10 Deployment checklist (do when going live)

Things that work locally but must be done or changed on the real server
(VPS + Coolify + own domain).

### Must do before going live

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

### Server setup

- [ ] Node.js 22 or 24 LTS on the server (Node 20 is end of life).
- [ ] Add `.env.example` listing every variable (no values). `.gitignore` currently ignores
      all `.env*` files, so add an exception: `!.env.example`.
- [ ] `scripts/local-db.mjs` and the `db:init/start/stop/status` commands are for local
      development only. Don't use them on the server.
- [ ] Rename the package from `learning-hub` in `package.json`.

### Fine for one server, revisit if the app grows

- [ ] The limit of one email per address per minute (confirmation, password reset and
      invitation emails; `src/lib/throttle.js`) is kept in server
      memory. It resets on restart and isn't shared if the app ever runs on more than one server.
      Move it to Redis or the database then.

### Later features that depend on deployment

- [ ] Budget alerts and reminder emails (roadmap step 5) need a scheduled job, e.g. a cron
      task in Coolify calling a protected route.
- [ ] If profile pictures from other sites are allowed, add their hosts to `images.remotePatterns`
      in `next.config.mjs` (otherwise `next/image` throws an error).
