create policy "admins can delete business clients"
on public.clients for delete to authenticated
using (public.is_business_admin(business_id));

grant delete on public.clients to authenticated;
