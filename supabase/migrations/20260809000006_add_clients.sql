create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  dni text not null check (dni ~ '^[0-9]{7,8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, dni)
);

insert into public.clients (business_id, name, dni)
select distinct on (business_id, dni) business_id, name, dni
from public.bookings
order by business_id, dni, created_at desc
on conflict (business_id, dni) do update set name = excluded.name, updated_at = now();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy "admins can read business clients"
on public.clients for select to authenticated
using (public.is_business_admin(business_id));

create policy "admins can insert business clients"
on public.clients for insert to authenticated
with check (public.is_business_admin(business_id));

create policy "admins can update business clients"
on public.clients for update to authenticated
using (public.is_business_admin(business_id))
with check (public.is_business_admin(business_id));

grant select, insert, update on public.clients to authenticated, service_role;
