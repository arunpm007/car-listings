-- Brands, models, cars, photos and the admin list.
-- Buyers read through the anon key, so row level security decides what is public.

create table public.brands (
  id smallint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  popular boolean not null default false
);

create table public.models (
  id integer generated always as identity primary key,
  brand_id smallint not null references public.brands (id) on delete restrict,
  name text not null,
  slug text not null,
  unique (brand_id, slug)
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table public.cars (
  id integer generated always as identity primary key,
  code text generated always as ('CAR-' || lpad(id::text, 4, '0')) stored unique,
  status text not null default 'listed'
    check (status in ('submitted', 'verified', 'listed', 'reserved', 'sold', 'archived')),
  brand_id smallint not null references public.brands (id),
  model_id integer not null references public.models (id),
  variant text,
  year smallint not null check (year between 1950 and 2100),
  fuel text not null check (fuel in ('petrol', 'diesel', 'cng', 'lpg', 'electric', 'hybrid')),
  transmission text not null check (transmission in ('manual', 'automatic')),
  body_type text check (body_type in ('hatchback', 'sedan', 'suv', 'muv', 'pickup', 'van', 'coupe', 'convertible')),
  km_driven integer not null check (km_driven >= 0),
  owners smallint not null default 1 check (owners between 1 and 10),
  color text,
  rto text,
  insurance_valid_until date,
  price integer not null check (price > 0),
  negotiable boolean not null default true,
  location text,
  description text,
  featured boolean not null default false,
  listed_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cars_status_listed_idx on public.cars (status, listed_at desc);
create index cars_brand_idx on public.cars (brand_id);
create index cars_price_idx on public.cars (price);

-- Things buyers must never see: who owns the car, the full plate, the floor price.
create table public.car_private (
  car_id integer primary key references public.cars (id) on delete cascade,
  seller_name text,
  seller_phone text,
  reg_number text,
  seller_min_price integer,
  commission integer,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.car_photos (
  id bigint generated always as identity primary key,
  car_id integer not null references public.cars (id) on delete cascade,
  full_path text not null,
  thumb_path text not null,
  width smallint,
  height smallint,
  position smallint not null default 0
);

create index car_photos_car_idx on public.car_photos (car_id, position);

-- Stamp updated_at, and the dates a car went live and sold.
create or replace function public.cars_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status in ('listed', 'reserved') and new.listed_at is null then
    new.listed_at := now();
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := now();
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

create trigger cars_touch
before insert or update on public.cars
for each row execute function public.cars_touch();

-- Row level security

alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.admins enable row level security;
alter table public.cars enable row level security;
alter table public.car_private enable row level security;
alter table public.car_photos enable row level security;

create policy "brands are public" on public.brands for select using (true);
create policy "admins manage brands" on public.brands for all
  using (public.is_admin()) with check (public.is_admin());

create policy "models are public" on public.models for select using (true);
create policy "admins manage models" on public.models for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins see themselves" on public.admins for select
  using (user_id = auth.uid());

create policy "public sees live and sold cars" on public.cars for select
  using (status in ('listed', 'reserved', 'sold') or public.is_admin());
create policy "admins manage cars" on public.cars for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage private details" on public.car_private for all
  using (public.is_admin()) with check (public.is_admin());

create policy "public sees photos of visible cars" on public.car_photos for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.cars c
      where c.id = car_id and c.status in ('listed', 'reserved', 'sold')
    )
  );
create policy "admins manage photos" on public.car_photos for all
  using (public.is_admin()) with check (public.is_admin());

-- Photo storage: anyone can view, only admins can upload or delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-photos', 'car-photos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload car photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'car-photos' and public.is_admin());
create policy "admins update car photos" on storage.objects for update to authenticated
  using (bucket_id = 'car-photos' and public.is_admin());
create policy "admins delete car photos" on storage.objects for delete to authenticated
  using (bucket_id = 'car-photos' and public.is_admin());
