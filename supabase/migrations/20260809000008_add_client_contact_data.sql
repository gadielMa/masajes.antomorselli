alter table public.clients
  add column if not exists email text,
  add column if not exists whatsapp text;

grant select, insert, update on public.clients to authenticated, service_role;
