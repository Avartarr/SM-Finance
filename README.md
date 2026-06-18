# S&M Finance

Secure two-user personal finance web app for Snowflake and Muffin, built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## What is included

- Supabase Auth login only, with no manual password storage.
- Database-enforced allowlist for exactly the two approved users.
- Row Level Security policies across all finance tables.
- Audit trail table populated by database triggers.
- Monthly budgets, additional income, recurring direct debits, expenses, reports, notes, history, and month closing.
- Dark-first responsive UI with light-mode variables available in CSS.

See [docs/setup-guide.md](docs/setup-guide.md) for full setup, Supabase SQL, seed data, and Vercel deployment steps.
