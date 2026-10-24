-- Why a car came off the website when it wasn't sold through us. Kept with the car
-- (never deleted) so the history, buyers and owner's details stay on record.
alter table public.car_private
  add column removed_reason text check (removed_reason in ('sold_elsewhere', 'owner_withdrew', 'other')),
  add column removed_note text,
  add column removed_at timestamptz;

-- Document copies are only needed while the car is for sale: clear them 30 days after
-- it's sold or removed. Going back on sale cancels that.
create or replace function public.car_documents_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('sold', 'archived') and old.status not in ('sold', 'archived') then
    update public.car_documents set delete_after = now() + interval '30 days' where car_id = new.id and delete_after is null;
  elsif new.status not in ('sold', 'archived') and old.status in ('sold', 'archived') then
    update public.car_documents set delete_after = null where car_id = new.id;
  end if;
  return new;
end;
$$;
