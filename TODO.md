# Frontend Portfolio TODO (Next.js App Router)

## 1 Understand and apply Next.js structure

- [ ] Keep routes in src/app with file conventions:
  - page.js: route UI
  - layout.js: shared wrapper
  - loading.js: suspense fallback
  - error.js: route-level error boundary
  - not-found.js: custom 404 per segment
  - route.js: API handlers
- [ ] Use route folders for URL segments and dynamic folders like [id].
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

- [ ] Add filters: date range, category, household member.
- [ ] Add searchable and sortable transactions table.
- [ ] Add charts (monthly trend, category pie, savings forecast).
- [ ] Add pagination or virtualized list for transactions.

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

- [ ] Add authentication flow (sign in/sign up/sign out).
- [ ] Add protected routes and role-based views (owner, editor, viewer).
- [ ] Show permission-aware UI controls (disable/hide actions by role).

## 7 Real-time and collaboration

- [ ] Add live expense updates (WebSocket or polling).
- [ ] Add notification center for invites and budget alerts.
- [ ] Add optimistic UI for invite and expense creation.

## 8 Testing and quality gates

- [ ] Add unit tests for reducers and utility formatters.
- [ ] Add component tests for forms and list rendering.
- [ ] Add integration tests for key user flows.
- [ ] Add CI checks: lint, test, build.

## 9 Performance and production readiness

- [ ] Use dynamic imports for heavy charts.
- [ ] Measure bundle size and optimize client components.
- [ ] Add metadata, OG images, sitemap, robots.
- [ ] Add analytics and error monitoring.

- currency per profile 
- sign in / sign up 
- setup profile 
