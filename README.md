# Household Finance Hub

A household finance app: track expenses, budgets and savings goals, and share them with the
people you live with. Built with [Next.js](https://nextjs.org), PostgreSQL and
[Drizzle ORM](https://orm.drizzle.team).

## Requirements

- [Node.js](https://nodejs.org) 22 or 24 (LTS)
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

## Email

| Variable     | What it does                                                                        |
| ------------ | ----------------------------------------------------------------------------------- |
| `SMTP_URL`   | Mail server to send through, e.g. `smtps://user:password@smtp.example.com:465`      |
| `EMAIL_FROM` | Sender shown to recipients, e.g. `Household Finance Hub <no-reply@yourdomain.com>` |

- **Without `SMTP_URL`** (local development): emails are printed in the `npm run dev` terminal.
- **In production `SMTP_URL` is required.** The app refuses to print emails there, so links
  never end up in server logs. Any SMTP provider works (Resend, Brevo, Postmark, your mail host).
  Most providers have a free tier, but they need you to verify your domain first.
- To see emails as a real inbox locally, run [Mailpit](https://mailpit.axllent.org) (one
  program, no install or admin rights needed). Then add `SMTP_URL=smtp://localhost:1025` to
  `.env.local` and open http://localhost:8025.
- If a password in `SMTP_URL` contains special characters (`@`, `:`, `/`, `#`), URL-encode them.

`.env.local` also holds `BETTER_AUTH_SECRET` (signs login sessions; keep it secret, and use a
different one in production) and `BETTER_AUTH_URL` (the site's address, `http://localhost:3000`
locally).

If the app shows `ECONNREFUSED ... 5433` errors, the database isn't running. Run
`npm run db:start`.

## Database commands

| Command               | What it does                                                |
| --------------------- | ----------------------------------------------------------- |
| `npm run db:start`    | Start the local database server                             |
| `npm run db:stop`     | Stop it                                                     |
| `npm run db:status`   | Show whether it is running                                  |
| `npm run db:migrate`  | Apply new migrations (run after pulling schema changes)     |
| `npm run db:generate` | After editing `src/db/schema/`, create a new migration file |
| `npm run db:studio`   | Browse and edit data in the browser (Drizzle Studio)        |

See [schema.md](schema.md) for the tables and the permission rules.

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
