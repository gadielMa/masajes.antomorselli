alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method in ('mercadopago', 'cash', 'pending'));
