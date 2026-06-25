-- Destructive reset for going live in July 2026.
-- Run this in Supabase SQL Editor only after you are sure you want to remove
-- all test finance data. This keeps Auth users and the two-user allowlist.

truncate table
  public.monthly_summaries,
  public.credit_card_totals,
  public.savings,
  public.expenses,
  public.direct_debit_month_statuses,
  public.additional_income,
  public.budgets,
  public.months,
  public.direct_debits,
  public.notes,
  public.actions
restart identity cascade;

with june as (
  insert into public.months (month_start, status)
  values ('2026-06-01', 'open')
  returning id
)
insert into public.budgets (month_id, house_budget_amount, total_budget_amount)
select id, 0, 0
from june;
