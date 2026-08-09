create table if not exists public.client_email_sends (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  recipient text not null,
  subject text not null,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists client_email_sends_business_month_idx
  on public.client_email_sends (business_id, sent_at);

alter table public.client_email_sends enable row level security;
grant all on public.client_email_sends to service_role;
