-- Phase 2: owners asking to sell, buyers who got in touch, and taps on Call/WhatsApp.

-- What an owner sends from the public "Sell your car" form. Written by the server with the
-- secret key after validation and rate limiting, so there are no public policies here.
-- Brand and model stay as typed until the admin turns the request into a listing,
-- so public input never lands in the catalogue.
create table public.sell_requests (
  id integer generated always as identity primary key,
  code text generated always as ('SELL-' || lpad(id::text, 4, '0')) stored unique,
  -- Unguessable handle given only to the submitter, used for their photo folder.
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'rejected')),
  seller_name text not null,
  seller_phone text not null,
  brand_id smallint references public.brands (id) on delete set null,
  brand_text text,
  model_id integer references public.models (id) on delete set null,
  model_text text,
  variant text,
  year smallint check (year between 1950 and 2100),
  fuel text check (fuel in ('petrol', 'diesel', 'cng', 'lpg', 'electric', 'hybrid')),
  transmission text check (transmission in ('manual', 'automatic')),
  km_driven integer check (km_driven >= 0),
  expected_price integer check (expected_price > 0),
  location text,
  notes text,
  photos jsonb not null default '[]'::jsonb,
  ip_hash text,
  car_id integer references public.cars (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sell_requests_status_idx on public.sell_requests (status, created_at desc);
create index sell_requests_ip_idx on public.sell_requests (ip_hash, created_at desc);
create index sell_requests_phone_idx on public.sell_requests (seller_phone, created_at desc);

-- Buyers the mediator is talking to. Entered by the admin after a call or message.
create table public.leads (
  id integer generated always as identity primary key,
  name text,
  phone text,
  car_id integer references public.cars (id) on delete set null,
  source text not null default 'call' check (source in ('call', 'whatsapp', 'walk-in', 'referral', 'other')),
  status text not null default 'new'
    check (status in ('new', 'follow-up', 'visit-booked', 'bought', 'lost')),
  follow_up_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status, follow_up_on);
create index leads_car_idx on public.leads (car_id);

-- One row per tap on Call or WhatsApp on a car page. No personal data: just which car and how.
create table public.contact_clicks (
  id bigint generated always as identity primary key,
  car_id integer not null references public.cars (id) on delete cascade,
  channel text not null check (channel in ('call', 'whatsapp')),
  created_at timestamptz not null default now()
);

create index contact_clicks_car_idx on public.contact_clicks (car_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sell_requests_touch before update on public.sell_requests
for each row execute function public.touch_updated_at();
create trigger leads_touch before update on public.leads
for each row execute function public.touch_updated_at();

alter table public.sell_requests enable row level security;
alter table public.leads enable row level security;
alter table public.contact_clicks enable row level security;

create policy "admins manage sell requests" on public.sell_requests for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage leads" on public.leads for all
  using (public.is_admin()) with check (public.is_admin());

-- Anyone can log a tap on a car that is publicly visible; only admins can read them.
create policy "anyone logs a tap on a visible car" on public.contact_clicks for insert to anon, authenticated
  with check (
    exists (select 1 from public.cars c where c.id = car_id and c.status in ('listed', 'reserved'))
  );
create policy "admins read taps" on public.contact_clicks for select
  using (public.is_admin());
create policy "admins delete taps" on public.contact_clicks for delete
  using (public.is_admin());

-- Taps per car over the last 30 days, for the admin dashboard.
create view public.car_interest
with (security_invoker = true)
as
select
  car_id,
  count(*) filter (where channel = 'call')::int as calls,
  count(*) filter (where channel = 'whatsapp')::int as whatsapps
from public.contact_clicks
where created_at > now() - interval '30 days'
group by car_id;
