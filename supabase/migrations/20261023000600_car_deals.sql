-- Who a car is "in deal" with, and the token they paid. Kept on car_private so only admins
-- can read it: the cars row is public. Other interested buyers are the car's open leads,
-- which form the waiting queue in the order they came in.

alter table public.car_private
  add column deal_lead_id integer references public.leads (id) on delete set null,
  add column deal_token integer check (deal_token is null or deal_token >= 0),
  add column deal_started_at timestamptz;

-- A lead can now be the buyer a car is in deal with.
alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'follow-up', 'visit-booked', 'in-deal', 'bought', 'lost'));
