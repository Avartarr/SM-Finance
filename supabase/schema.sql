create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.authorized_users (
  email citext primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text,
  is_authorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.months (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null unique references public.months(id) on delete restrict,
  house_budget_amount numeric(12,2) not null default 0 check (house_budget_amount >= 0),
  total_budget_amount numeric(12,2) not null default 0 check (total_budget_amount >= 0),
  created_by uuid references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.additional_income (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.direct_debits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.direct_debit_month_statuses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete restrict,
  direct_debit_id uuid not null references public.direct_debits(id) on delete cascade,
  is_enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month_id, direct_debit_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_card_totals (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete restrict,
  card_key text not null check (card_key in ('lloyds', 'amex')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month_id, card_key)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  content text not null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null unique references public.months(id) on delete restrict,
  total_budget numeric(12,2) not null default 0,
  additional_income numeric(12,2) not null default 0,
  total_direct_debits numeric(12,2) not null default 0,
  total_expenses numeric(12,2) not null default 0,
  total_savings numeric(12,2) not null default 0,
  remaining_balance numeric(12,2) not null default 0,
  house_budget numeric(12,2) not null default 0,
  house_expenses numeric(12,2) not null default 0,
  house_budget_remaining numeric(12,2) not null default 0,
  closed_by uuid references auth.users(id) default auth.uid(),
  closed_at timestamptz not null default now()
);

create table if not exists public.actions (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_month_id_idx on public.expenses(month_id);
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists expenses_category_idx on public.expenses(category);
create index if not exists savings_month_id_idx on public.savings(month_id);
create index if not exists savings_date_idx on public.savings(date);
create index if not exists credit_card_totals_month_id_idx on public.credit_card_totals(month_id);
create index if not exists debit_month_statuses_month_id_idx on public.direct_debit_month_statuses(month_id);
create index if not exists debit_month_statuses_debit_id_idx on public.direct_debit_month_statuses(direct_debit_id);
create index if not exists income_month_id_idx on public.additional_income(month_id);
create index if not exists actions_actor_user_id_idx on public.actions(actor_user_id);
create index if not exists actions_created_at_idx on public.actions(created_at);

create or replace function public.app_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_authorized = true
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  authorized public.authorized_users%rowtype;
begin
  select * into authorized
  from public.authorized_users
  where lower(email::text) = lower(new.email);

  insert into public.users (id, email, display_name, is_authorized)
  values (
    new.id,
    new.email,
    authorized.display_name,
    authorized.email is not null
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    is_authorized = excluded.is_authorized,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_table_name in ('budgets', 'direct_debits', 'direct_debit_month_statuses', 'credit_card_totals') then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.prevent_closed_month_changes()
returns trigger
language plpgsql
as $$
declare
  target_month_id uuid;
begin
  if tg_op = 'DELETE' then
    target_month_id := old.month_id;
  else
    target_month_id := new.month_id;
  end if;

  if exists (
    select 1 from public.months
    where id = target_month_id
      and status = 'closed'
  ) then
    raise exception 'Closed months cannot be edited';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.set_month_closed_by()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_by = auth.uid();
    new.closed_at = coalesce(new.closed_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.audit_finance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload_id uuid;
begin
  if tg_op = 'DELETE' then
    payload_id := (to_jsonb(old)->>'id')::uuid;
  else
    payload_id := (to_jsonb(new)->>'id')::uuid;
  end if;

  insert into public.actions (actor_user_id, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, payload_id, to_jsonb(old), to_jsonb(new));

  return coalesce(new, old);
end;
$$;

drop trigger if exists touch_budgets_updated_at on public.budgets;
create trigger touch_budgets_updated_at
before update on public.budgets
for each row execute function public.touch_updated_at();

drop trigger if exists touch_direct_debits_updated_at on public.direct_debits;
create trigger touch_direct_debits_updated_at
before update on public.direct_debits
for each row execute function public.touch_updated_at();

drop trigger if exists touch_direct_debit_month_statuses_updated_at on public.direct_debit_month_statuses;
create trigger touch_direct_debit_month_statuses_updated_at
before update on public.direct_debit_month_statuses
for each row execute function public.touch_updated_at();

drop trigger if exists touch_expenses_updated_at on public.expenses;
create trigger touch_expenses_updated_at
before update on public.expenses
for each row execute function public.touch_updated_at();

drop trigger if exists touch_savings_updated_at on public.savings;
create trigger touch_savings_updated_at
before update on public.savings
for each row execute function public.touch_updated_at();

drop trigger if exists touch_credit_card_totals_updated_at on public.credit_card_totals;
create trigger touch_credit_card_totals_updated_at
before update on public.credit_card_totals
for each row execute function public.touch_updated_at();

drop trigger if exists touch_notes_updated_at on public.notes;
create trigger touch_notes_updated_at
before update on public.notes
for each row execute function public.touch_updated_at();

drop trigger if exists lock_budgets_when_month_closed on public.budgets;
create trigger lock_budgets_when_month_closed
before insert or update or delete on public.budgets
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists lock_income_when_month_closed on public.additional_income;
create trigger lock_income_when_month_closed
before insert or update or delete on public.additional_income
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists lock_expenses_when_month_closed on public.expenses;
create trigger lock_expenses_when_month_closed
before insert or update or delete on public.expenses
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists lock_savings_when_month_closed on public.savings;
create trigger lock_savings_when_month_closed
before insert or update or delete on public.savings
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists lock_credit_cards_when_month_closed on public.credit_card_totals;
create trigger lock_credit_cards_when_month_closed
before insert or update or delete on public.credit_card_totals
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists lock_debit_month_statuses_when_month_closed on public.direct_debit_month_statuses;
create trigger lock_debit_month_statuses_when_month_closed
before insert or update or delete on public.direct_debit_month_statuses
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists close_month_actor on public.months;
create trigger close_month_actor
before update on public.months
for each row execute function public.set_month_closed_by();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'months',
    'budgets',
    'additional_income',
    'direct_debits',
    'direct_debit_month_statuses',
    'expenses',
    'savings',
    'credit_card_totals',
    'notes',
    'monthly_summaries'
  ]
  loop
    execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_finance_change()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.authorized_users enable row level security;
alter table public.users enable row level security;
alter table public.months enable row level security;
alter table public.budgets enable row level security;
alter table public.additional_income enable row level security;
alter table public.direct_debits enable row level security;
alter table public.direct_debit_month_statuses enable row level security;
alter table public.expenses enable row level security;
alter table public.savings enable row level security;
alter table public.credit_card_totals enable row level security;
alter table public.notes enable row level security;
alter table public.monthly_summaries enable row level security;
alter table public.actions enable row level security;

drop policy if exists "authorized users are service-managed" on public.authorized_users;
create policy "authorized users are service-managed"
on public.authorized_users for select
using (false);

drop policy if exists "users can view own profile" on public.users;
create policy "users can view own profile"
on public.users for select
using (auth.uid() = id);

drop policy if exists "authorized users can view actions" on public.actions;
create policy "authorized users can view actions"
on public.actions for select
using (public.app_is_authorized());

drop policy if exists "authorized users read months" on public.months;
create policy "authorized users read months"
on public.months for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert months" on public.months;
create policy "authorized users insert months"
on public.months for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update months" on public.months;
create policy "authorized users update months"
on public.months for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users read budgets" on public.budgets;
create policy "authorized users read budgets"
on public.budgets for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert budgets" on public.budgets;
create policy "authorized users insert budgets"
on public.budgets for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update budgets" on public.budgets;
create policy "authorized users update budgets"
on public.budgets for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users read income" on public.additional_income;
create policy "authorized users read income"
on public.additional_income for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert income" on public.additional_income;
create policy "authorized users insert income"
on public.additional_income for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update income" on public.additional_income;
create policy "authorized users update income"
on public.additional_income for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete income" on public.additional_income;
create policy "authorized users delete income"
on public.additional_income for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read direct debits" on public.direct_debits;
create policy "authorized users read direct debits"
on public.direct_debits for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert direct debits" on public.direct_debits;
create policy "authorized users insert direct debits"
on public.direct_debits for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update direct debits" on public.direct_debits;
create policy "authorized users update direct debits"
on public.direct_debits for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete direct debits" on public.direct_debits;
create policy "authorized users delete direct debits"
on public.direct_debits for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read debit month statuses" on public.direct_debit_month_statuses;
create policy "authorized users read debit month statuses"
on public.direct_debit_month_statuses for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert debit month statuses" on public.direct_debit_month_statuses;
create policy "authorized users insert debit month statuses"
on public.direct_debit_month_statuses for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update debit month statuses" on public.direct_debit_month_statuses;
create policy "authorized users update debit month statuses"
on public.direct_debit_month_statuses for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete debit month statuses" on public.direct_debit_month_statuses;
create policy "authorized users delete debit month statuses"
on public.direct_debit_month_statuses for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read expenses" on public.expenses;
create policy "authorized users read expenses"
on public.expenses for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert expenses" on public.expenses;
create policy "authorized users insert expenses"
on public.expenses for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update expenses" on public.expenses;
create policy "authorized users update expenses"
on public.expenses for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete expenses" on public.expenses;
create policy "authorized users delete expenses"
on public.expenses for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read savings" on public.savings;
create policy "authorized users read savings"
on public.savings for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert savings" on public.savings;
create policy "authorized users insert savings"
on public.savings for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update savings" on public.savings;
create policy "authorized users update savings"
on public.savings for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete savings" on public.savings;
create policy "authorized users delete savings"
on public.savings for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read credit cards" on public.credit_card_totals;
create policy "authorized users read credit cards"
on public.credit_card_totals for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert credit cards" on public.credit_card_totals;
create policy "authorized users insert credit cards"
on public.credit_card_totals for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update credit cards" on public.credit_card_totals;
create policy "authorized users update credit cards"
on public.credit_card_totals for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete credit cards" on public.credit_card_totals;
create policy "authorized users delete credit cards"
on public.credit_card_totals for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read notes" on public.notes;
create policy "authorized users read notes"
on public.notes for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert notes" on public.notes;
create policy "authorized users insert notes"
on public.notes for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update notes" on public.notes;
create policy "authorized users update notes"
on public.notes for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

drop policy if exists "authorized users delete notes" on public.notes;
create policy "authorized users delete notes"
on public.notes for delete
using (public.app_is_authorized());

drop policy if exists "authorized users read summaries" on public.monthly_summaries;
create policy "authorized users read summaries"
on public.monthly_summaries for select
using (public.app_is_authorized());

drop policy if exists "authorized users insert summaries" on public.monthly_summaries;
create policy "authorized users insert summaries"
on public.monthly_summaries for insert
with check (public.app_is_authorized());

drop policy if exists "authorized users update summaries" on public.monthly_summaries;
create policy "authorized users update summaries"
on public.monthly_summaries for update
using (public.app_is_authorized())
with check (public.app_is_authorized());

alter table public.months replica identity full;
alter table public.budgets replica identity full;
alter table public.additional_income replica identity full;
alter table public.direct_debits replica identity full;
alter table public.direct_debit_month_statuses replica identity full;
alter table public.expenses replica identity full;
alter table public.savings replica identity full;
alter table public.credit_card_totals replica identity full;
alter table public.notes replica identity full;
alter table public.monthly_summaries replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table
      public.months,
      public.budgets,
      public.additional_income,
      public.direct_debits,
      public.direct_debit_month_statuses,
      public.expenses,
      public.savings,
      public.credit_card_totals,
      public.notes,
      public.monthly_summaries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
