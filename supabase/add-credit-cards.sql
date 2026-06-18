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

create index if not exists credit_card_totals_month_id_idx
on public.credit_card_totals(month_id);

drop trigger if exists touch_credit_card_totals_updated_at on public.credit_card_totals;
create trigger touch_credit_card_totals_updated_at
before update on public.credit_card_totals
for each row execute function public.touch_updated_at();

drop trigger if exists lock_credit_cards_when_month_closed on public.credit_card_totals;
create trigger lock_credit_cards_when_month_closed
before insert or update or delete on public.credit_card_totals
for each row execute function public.prevent_closed_month_changes();

drop trigger if exists audit_credit_card_totals on public.credit_card_totals;
create trigger audit_credit_card_totals
after insert or update or delete on public.credit_card_totals
for each row execute function public.audit_finance_change();

alter table public.credit_card_totals enable row level security;

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

alter table public.credit_card_totals replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.credit_card_totals;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
