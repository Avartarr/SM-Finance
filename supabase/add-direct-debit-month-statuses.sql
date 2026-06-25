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

create index if not exists debit_month_statuses_month_id_idx
on public.direct_debit_month_statuses(month_id);

create index if not exists debit_month_statuses_debit_id_idx
on public.direct_debit_month_statuses(direct_debit_id);

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

drop trigger if exists touch_direct_debit_month_statuses_updated_at on public.direct_debit_month_statuses;
create trigger touch_direct_debit_month_statuses_updated_at
before update on public.direct_debit_month_statuses
for each row execute function public.touch_updated_at();

drop trigger if exists lock_debit_month_statuses_when_month_closed on public.direct_debit_month_statuses;
create trigger lock_debit_month_statuses_when_month_closed
before insert or update or delete on public.direct_debit_month_statuses
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists audit_direct_debit_month_statuses on public.direct_debit_month_statuses;
create trigger audit_direct_debit_month_statuses
after insert or update or delete on public.direct_debit_month_statuses
for each row execute function public.audit_finance_change();

alter table public.direct_debit_month_statuses enable row level security;

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

alter table public.direct_debit_month_statuses replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.direct_debit_month_statuses;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
