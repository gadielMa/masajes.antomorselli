-- Distingue pagos confirmados por Mercado Pago de turnos cargados manualmente.

alter table public.bookings
  add column if not exists payment_method text not null default 'mercadopago'
  check (payment_method in ('mercadopago', 'cash'));

drop policy if exists "admins can read business bookings" on public.bookings;
create policy "admins can read business bookings"
on public.bookings for select
to authenticated
using (public.is_business_admin(business_id));

drop policy if exists "admins can manage business bookings" on public.bookings;
create policy "admins can manage business bookings"
on public.bookings for insert
to authenticated
with check (public.is_business_admin(business_id));

drop policy if exists "admins can update business bookings" on public.bookings;
create policy "admins can update business bookings"
on public.bookings for update
to authenticated
using (public.is_business_admin(business_id))
with check (public.is_business_admin(business_id));

grant select, insert, update on public.bookings to authenticated;
