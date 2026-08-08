-- El rol administrativo de Supabase necesita permisos de tabla además de bypass de RLS.
grant select, insert, update
on table public.bookings
to service_role;
