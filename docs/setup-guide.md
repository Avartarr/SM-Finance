# S&M Finance Setup Guide

## 1. Install and Run Locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Add your Supabase values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Create the Supabase Project

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Authentication, create exactly two email/password users.
4. Edit `supabase/seed.sql` and replace:
   - `snowflake@example.com`
   - `muffin@example.com`
5. Run `supabase/seed.sql`.

If you already created the database before the savings feature was added, run
`supabase/add-savings.sql` once in the Supabase SQL Editor.

If you already created the database before the credit card totals feature was
added, run `supabase/add-credit-cards.sql` once in the Supabase SQL Editor.

The app does not provide sign-up. Users must be created in Supabase Auth, and access is granted only when the email exists in `public.authorized_users`.

## 3. Security Model

- Passwords are handled only by Supabase Auth.
- `public.users` stores profile and authorization status, not credentials.
- `public.authorized_users` is service-managed and hidden from normal clients by RLS.
- All finance tables require `public.app_is_authorized()` for reads and writes.
- Inserts, updates, and deletes on finance tables write to `public.actions`.
- Closed months are locked by database triggers for budgets, income, and expenses.

## 4. Vercel Deployment

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Set these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

Use only the public anon key in the frontend. Do not expose the Supabase service role key in Vercel frontend variables.

## 5. Supabase Realtime

The schema attempts to add the finance tables to the `supabase_realtime` publication. If your Supabase project already manages this through the dashboard, enable realtime for:

- `months`
- `budgets`
- `additional_income`
- `direct_debits`
- `expenses`
- `notes`
- `monthly_summaries`

## 6. Testing Checklist

1. Sign in as each authorized user.
2. Confirm an unauthorized Auth user is redirected from the app.
3. Add budgets, additional income, expenses, direct debits, and notes.
4. Confirm dashboard totals update immediately.
5. Close a month and confirm expense/budget edits are blocked.
6. Confirm a next month is created automatically.
7. Review `public.actions` to verify user actions are recorded.
