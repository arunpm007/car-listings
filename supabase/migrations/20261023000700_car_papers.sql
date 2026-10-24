-- Papers: what the mediator checked (public ticks) and copies of the documents (private).
-- The RC carries the owner's name and address and the chassis/engine numbers, so copies
-- live in a private bucket only admins can read, and are cleared out after the sale.

-- What buyers see: ticks, never the documents themselves.
alter table public.cars
  add column papers_rc_seen boolean not null default false,
  add column papers_insurance boolean not null default false,
  add column papers_puc boolean not null default false,
  add column papers_service_records boolean not null default false,
  add column papers_loan text check (papers_loan in ('none', 'closing'));

-- The owner said we may keep copies of the papers to verify the sale.
alter table public.car_private add column docs_consent boolean not null default false;

create table public.car_documents (
  id bigint generated always as identity primary key,
  car_id integer not null references public.cars (id) on delete cascade,
  kind text not null check (kind in ('rc', 'insurance', 'puc', 'noc', 'service', 'other')),
  path text not null unique,
  file_name text not null,
  mime text not null,
  size_bytes integer not null check (size_bytes > 0),
  -- Set when the car is sold; the files are removed after this date.
  delete_after timestamptz,
  created_at timestamptz not null default now()
);

create index car_documents_car_idx on public.car_documents (car_id);
create index car_documents_expiry_idx on public.car_documents (delete_after) where delete_after is not null;

alter table public.car_documents enable row level security;
create policy "admins manage car documents" on public.car_documents for all
  using (public.is_admin()) with check (public.is_admin());

-- Copies are kept 30 days after a sale (time for the RC transfer), then cleared.
-- Going back on sale cancels that.
create or replace function public.car_documents_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    update public.car_documents set delete_after = now() + interval '30 days' where car_id = new.id;
  elsif new.status <> 'sold' and old.status = 'sold' then
    update public.car_documents set delete_after = null where car_id = new.id;
  end if;
  return new;
end;
$$;

create trigger cars_documents_expiry after update of status on public.cars
for each row execute function public.car_documents_expiry();

-- Private bucket: no public URLs. Admins read through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-documents', 'car-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "admins read car documents" on storage.objects for select to authenticated
  using (bucket_id = 'car-documents' and public.is_admin());
create policy "admins upload car documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'car-documents' and public.is_admin());
create policy "admins delete car documents" on storage.objects for delete to authenticated
  using (bucket_id = 'car-documents' and public.is_admin());
