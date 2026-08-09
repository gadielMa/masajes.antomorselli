-- Identidad administrativa y horarios editables.
-- Los clientes invitados no necesitan una fila en profiles.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'client'
    check (role in ('admin', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 60
    check (slot_minutes between 15 and 240),
  active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint business_hours_valid_range check (start_time < end_time)
);

insert into public.business_hours (weekday, start_time, end_time, slot_minutes)
values
  (1, '14:00', '17:00', 60),
  (2, '14:00', '17:00', 60),
  (3, '14:00', '17:00', 60),
  (4, '14:00', '17:00', 60),
  (5, '14:00', '17:00', 60)
on conflict (weekday) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists business_hours_set_updated_at on public.business_hours;
create trigger business_hours_set_updated_at
before update on public.business_hours
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Todo usuario autenticado obtiene un perfil de cliente por defecto.
-- La promoción a admin se hace explícitamente desde el dashboard de Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.business_hours enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "authenticated users can read business hours" on public.business_hours;
create policy "authenticated users can read business hours"
on public.business_hours for select
to authenticated
using (true);

drop policy if exists "admins can manage business hours" on public.business_hours;
create policy "admins can manage business hours"
on public.business_hours for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.business_hours to authenticated;
grant execute on function public.is_admin() to authenticated;

