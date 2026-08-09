-- Reglas de disponibilidad para horarios únicos y repetitivos.
-- business_hours se conserva como compatibilidad; el editor nuevo usará esta tabla.

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default 'Disponible',
  start_date date not null,
  start_time time not null,
  end_time time not null,
  frequency text not null default 'once'
    check (frequency in ('once', 'weekly', 'monthly')),
  interval_count smallint not null default 1 check (interval_count between 1 and 52),
  occurrences smallint check (occurrences is null or occurrences between 1 and 500),
  until_date date,
  weekdays smallint[] not null default '{}'
    check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_valid_range check (start_time < end_time),
  constraint availability_rules_valid_dates check (until_date is null or until_date >= start_date),
  constraint availability_rules_weekly_days check (
    (frequency = 'weekly' and cardinality(weekdays) > 0) or frequency <> 'weekly'
  )
);

create index if not exists availability_rules_business_idx
  on public.availability_rules (business_id, start_date, active);

insert into public.availability_rules
  (business_id, title, start_date, start_time, end_time, frequency, weekdays, active)
select
  business_id,
  'Disponible',
  current_date - (extract(isodow from current_date)::int - 1),
  start_time,
  end_time,
  'weekly',
  array[weekday]::smallint[],
  active
from public.business_hours
on conflict do nothing;

drop trigger if exists availability_rules_set_updated_at on public.availability_rules;
create trigger availability_rules_set_updated_at
before update on public.availability_rules
for each row execute function public.set_updated_at();

alter table public.availability_rules enable row level security;

drop policy if exists "members can read availability rules" on public.availability_rules;
create policy "members can read availability rules"
on public.availability_rules for select
to authenticated
using (public.is_business_admin(business_id));

drop policy if exists "admins can manage availability rules" on public.availability_rules;
create policy "admins can manage availability rules"
on public.availability_rules for all
to authenticated
using (public.is_business_admin(business_id))
with check (public.is_business_admin(business_id));

grant select, insert, update, delete on public.availability_rules to authenticated, service_role;
