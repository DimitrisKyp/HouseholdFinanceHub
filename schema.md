# Household Finance Hub - Final Schema (v1)

This is the finalized schema baseline for migrating app business logic into a relational database.

## Recommended SQL target

- PostgreSQL 15+
- UUID primary keys (`gen_random_uuid()`)
- UTC timestamps (`timestamptz`)

## Core business entities

### 1) users

Purpose: Application identities.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  username varchar(50) not null unique,
  email varchar(255) not null unique,
  password_hash text not null,
  role varchar(20) not null default 'viewer',
  job_description varchar(120),
  profile_picture_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_chk check (role in ('owner', 'editor', 'viewer'))
);
```

### 2) households

Purpose: Top level container for shared finance data.

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  base_currency char(3) not null default 'EUR',
  timezone varchar(64) not null default 'UTC',
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3) household_memberships

Purpose: Many to many relation between users and households, with role per household.

```sql
create table household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role varchar(20) not null default 'viewer',
  status varchar(20) not null default 'active',
  invited_by_user_id uuid references users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id),
  constraint household_memberships_role_chk check (role in ('owner', 'editor', 'viewer')),
  constraint household_memberships_status_chk check (status in ('pending', 'active', 'removed'))
);
```

### 4) expense_categories

Purpose: Category list used by expenses and budgeting.

```sql
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name varchar(50) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name)
);
```

### 5) expenses

Purpose: Monthly household expense tracking by category and member.

```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references expense_categories(id),
  paid_by_user_id uuid not null references users(id),
  title varchar(120) not null,
  notes text,
  amount numeric(12,2) not null,
  expense_date date not null,
  month_key char(7) generated always as (to_char(expense_date, 'YYYY-MM')) stored,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_chk check (amount >= 0)
);

create index idx_expenses_household_month on expenses(household_id, month_key);
create index idx_expenses_household_category on expenses(household_id, category_id);
create index idx_expenses_paid_by on expenses(paid_by_user_id);
```

### 6) assets

Purpose: Track asset and income source positions.

```sql
create table assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_user_id uuid references users(id),
  asset_type varchar(30) not null,
  name varchar(120) not null,
  symbol varchar(20),
  source varchar(100),
  quantity numeric(18,8),
  unit_value numeric(18,4),
  market_value numeric(14,2),
  currency char(3) not null default 'EUR',
  acquisition_date date,
  is_income_source boolean not null default false,
  expected_monthly_income numeric(12,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_asset_type_chk check (
    asset_type in ('salary', 'freelance', 'cash', 'land', 'stock', 'crypto', 'gold', 'bond', 'fund', 'other')
  ),
  constraint assets_expected_income_chk check (expected_monthly_income is null or expected_monthly_income >= 0)
);

create index idx_assets_household_type on assets(household_id, asset_type);
```

### 7) goals

Purpose: Financial goals with progress tracking.

```sql
create table goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_user_id uuid references users(id),
  name varchar(120) not null,
  note text,
  target_amount numeric(12,2),
  current_amount numeric(12,2) not null default 0,
  progress_percent numeric(5,2) not null default 0,
  start_date date,
  target_date date,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_status_chk check (status in ('active', 'paused', 'completed', 'cancelled')),
  constraint goals_progress_chk check (progress_percent >= 0 and progress_percent <= 100)
);

create index idx_goals_household_status on goals(household_id, status);
```

## Core support tables

### budget_limits

Stores monthly limit per category.

```sql
create table budget_limits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references expense_categories(id) on delete cascade,
  month_key char(7) not null,
  amount_limit numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_id, month_key),
  constraint budget_limits_amount_chk check (amount_limit >= 0)
);
```

### recurring_transactions

For rent, subscriptions, salary, and other recurring entries.

```sql
create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  transaction_type varchar(20) not null,
  category_id uuid references expense_categories(id),
  paid_by_user_id uuid references users(id),
  title varchar(120) not null,
  amount numeric(12,2) not null,
  frequency varchar(20) not null default 'monthly',
  day_of_month int,
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_transactions_type_chk check (transaction_type in ('income', 'expense')),
  constraint recurring_transactions_frequency_chk check (frequency in ('weekly', 'monthly', 'yearly'))
);

create index idx_recurring_transactions_household_type on recurring_transactions(household_id, transaction_type);
create index idx_recurring_transactions_active on recurring_transactions(household_id, is_active);
```

## Multi-user and multi-household support

Yes. This schema supports multiple users and multiple households.

1. A user can join many households through `household_memberships`.
2. A household can contain many users through `household_memberships`.
3. Access is scoped per household using `household_memberships.role`.
4. Finance entities (`expenses`, `assets`, `goals`, `budget_limits`, `recurring_transactions`) are household-scoped with `household_id`.

Result: one account can participate in several households, and each household remains isolated for permissions and reporting.

## Business logic rules

1. Role permissions
- owner: full access to household, members, settings.
- editor: can create and update expenses/assets/goals.
- viewer: read only.

2. Household scope
- Every finance row must belong to exactly one household.
- Users can belong to multiple households through `household_memberships`.
- Household membership role (`household_memberships.role`) is the authorization source for household actions.

3. Monthly reporting
- Use `month_key` for fast monthly aggregations and dashboard snapshots.

4. Soft lifecycle
- Prefer status/is_active flags for users, memberships, goals, and assets.

5. Audit
- Keep `created_at` and `updated_at` on all mutable tables.
- For critical actions, later add `audit_logs` table.

## Suggested migration order

1. users
2. households
3. household_memberships
4. expense_categories
5. expenses
6. assets
7. goals
8. budget_limits
9. recurring_transactions

## Mapping from current app state

- `incomeSources` and part of `recurringExpenses` can move into `recurring_transactions`.
- `budgetCategories` can seed `expense_categories` and `budget_limits`.
- `members` maps to `users` plus `household_memberships`.
- `goals` maps to `goals`.
- `expenses` maps directly to `expenses`.
- `currentUser` maps to `users`.
