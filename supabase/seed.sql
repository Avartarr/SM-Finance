-- Edit only these four values before running this file.
do $$
declare

  user_one_email text := 'sunshineokoye6@gmail.com';
  user_one_name text := 'Snowflake';
  user_two_email text := 'chibuzoakanwa@gmail.com';
  user_two_name text := 'Muffin';

  user_one_id uuid;
  user_two_id uuid;
  seed_actor_id uuid;
  jan_id uuid;
  feb_id uuid;
begin
  insert into public.authorized_users (email, display_name)
  values
    (user_one_email, user_one_name),
    (user_two_email, user_two_name)
  on conflict (email) do update set display_name = excluded.display_name;

  select id into user_one_id from auth.users where lower(email) = lower(user_one_email);
  select id into user_two_id from auth.users where lower(email) = lower(user_two_email);
  seed_actor_id := coalesce(user_one_id, user_two_id);

  if user_one_id is null and user_two_id is null then
    raise exception 'Create the two Supabase Auth users first, then rerun this seed file.';
  end if;

  if user_one_id is not null then
    insert into public.users (id, email, display_name, is_authorized)
    values (user_one_id, user_one_email, user_one_name, true)
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      is_authorized = true,
      updated_at = now();
  end if;

  if user_two_id is not null then
    insert into public.users (id, email, display_name, is_authorized)
    values (user_two_id, user_two_email, user_two_name, true)
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      is_authorized = true,
      updated_at = now();
  end if;

  insert into public.months (month_start, status, created_by)
  values ('2026-01-01', 'open', seed_actor_id)
  on conflict (month_start) do update set status = 'open'
  returning id into jan_id;

  insert into public.months (month_start, status, created_by)
  values ('2026-02-01', 'open', seed_actor_id)
  on conflict (month_start) do update set status = excluded.status
  returning id into feb_id;

  insert into public.budgets (month_id, house_budget_amount, total_budget_amount, created_by)
  values
    (jan_id, 900, 3200, seed_actor_id),
    (feb_id, 950, 3400, seed_actor_id)
  on conflict (month_id) do update set
    house_budget_amount = excluded.house_budget_amount,
    total_budget_amount = excluded.total_budget_amount;

  insert into public.direct_debits (name, amount, category, is_active, created_by)
  values
    ('Mortgage', 1200, 'Household', true, seed_actor_id),
    ('Council Tax', 165, 'Household', true, seed_actor_id),
    ('Broadband', 42, 'Utilities', true, seed_actor_id),
    ('Gym', 58, 'Health', false, seed_actor_id)
  on conflict do nothing;

  insert into public.additional_income (month_id, title, amount, date, notes, created_by)
  values
    (feb_id, 'Cashback', 32.50, '2026-02-06', 'Card reward', seed_actor_id),
    (feb_id, 'Gift', 100, '2026-02-10', 'Family birthday gift', seed_actor_id)
  on conflict do nothing;

  insert into public.expenses (month_id, title, amount, category, date, notes, created_by)
  values
    (jan_id, 'Groceries', 122.40, 'Household', '2026-01-05', 'Weekly shop', seed_actor_id),
    (jan_id, 'Train tickets', 45.80, 'Transport', '2026-01-08', null, seed_actor_id),
    (feb_id, 'Groceries', 96.20, 'Household', '2026-02-03', 'Weekly shop', seed_actor_id),
    (feb_id, 'Dinner', 62.10, 'Food', '2026-02-08', 'Date night', seed_actor_id),
    (feb_id, 'Pharmacy', 18.30, 'Health', '2026-02-11', null, seed_actor_id)
  on conflict do nothing;

  insert into public.savings (month_id, title, amount, date, notes, created_by)
  values
    (feb_id, 'Emergency fund', 150, '2026-02-12', 'Monthly savings transfer', seed_actor_id)
  on conflict do nothing;

  insert into public.notes (title, content, created_by)
  values
    ('Insurance Renewal', 'Home insurance renewal is due in April. Compare quotes before the renewal date.', seed_actor_id),
    ('Annual Bills', 'Remember TV licence and car service in spring.', seed_actor_id)
  on conflict do nothing;

  insert into public.monthly_summaries (
    month_id,
    total_budget,
    additional_income,
    total_direct_debits,
    total_expenses,
    total_savings,
    remaining_balance,
    house_budget,
    house_expenses,
    house_budget_remaining,
    closed_by
  )
  values (jan_id, 3200, 0, 1407, 168.20, 0, 1624.80, 900, 168.20, 731.80, seed_actor_id)
  on conflict (month_id) do update set
    total_budget = excluded.total_budget,
    total_direct_debits = excluded.total_direct_debits,
    total_expenses = excluded.total_expenses,
    total_savings = excluded.total_savings,
    remaining_balance = excluded.remaining_balance,
    house_budget = excluded.house_budget,
    house_expenses = excluded.house_expenses,
    house_budget_remaining = excluded.house_budget_remaining;

  update public.months
  set status = 'closed',
      closed_by = seed_actor_id,
      closed_at = '2026-01-31 23:00:00+00'
  where id = jan_id;
end $$;
