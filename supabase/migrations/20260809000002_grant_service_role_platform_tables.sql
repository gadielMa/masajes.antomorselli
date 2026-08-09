-- Las Edge Functions usan service_role y necesitan permisos explícitos
-- sobre las tablas del modelo administrativo.

grant select, insert, update, delete
on table public.profiles, public.businesses, public.business_members, public.business_hours
to service_role;

grant usage, select
on all sequences in schema public
to service_role;
