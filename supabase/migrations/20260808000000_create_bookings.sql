create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  dni text not null check (dni ~ '^[0-9]{7,8}$'),
  service text not null check (service in ('descontracturante', 'relajante', 'deportivo')),
  booking_date date not null,
  booking_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_id text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create unique index if not exists bookings_active_slot_idx
  on public.bookings (booking_date, booking_time)
  where status in ('pending', 'confirmed');

create index if not exists bookings_dni_idx on public.bookings (dni);
create index if not exists bookings_date_idx on public.bookings (booking_date);

alter table public.bookings enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.cleanup_expired_bookings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
  set status = 'cancelled', updated_at = now()
  where status = 'pending' and expires_at < now();
$$;

revoke all on public.bookings from anon, authenticated;
grant select, insert, update on public.bookings to service_role;
