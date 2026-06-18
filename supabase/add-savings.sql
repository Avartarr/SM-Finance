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

alter table public.monthly_summaries
add column if not exists total_savings numeric(12,2) not null default 0;

create index if not exists savings_month_id_idx on public.savings(month_id);
create index if not exists savings_date_idx on public.savings(date);

drop trigger if exists touch_savings_updated_at on public.savings;
create trigger touch_savings_updated_at
before update on public.savings
for each row execute function public.touch_updated_at();

drop trigger if exists lock_savings_when_month_closed on public.savings;
create trigger lock_savings_when_month_closed
before insert or update or delete on public.savings
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists audit_savings on public.savings;
create trigger audit_savings
after insert or update or delete on public.savings
for each row execute function public.audit_finance_change();

alter table public.savings enable row level security;

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

alter table public.savings replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.savings;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
