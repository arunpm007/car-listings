-- Business details the admin can change without touching code: name, contact numbers,
-- hours and so on. Exactly one row (id = 1). Everyone can read it; only admins can edit.

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null check (char_length(name) between 2 and 60),
  tagline text not null default '' check (char_length(tagline) <= 140),
  city text not null default '' check (char_length(city) <= 60),
  phone text not null check (char_length(phone) between 6 and 20),
  -- Digits only with country code, as wa.me wants it, e.g. 919876543210.
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address text check (address is null or char_length(address) <= 200),
  map_url text check (map_url is null or map_url ~ '^https://'),
  hours text not null default '' check (char_length(hours) <= 80),
  show_car_area boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, name, tagline, city, phone, whatsapp, email, hours)
values (
  1,
  'Coorg Car Point',
  'Verified second-hand cars, straight from their owners.',
  'Coorg',
  '+91 98765 43210',
  '919876543210',
  null,
  'Mon–Sat, 9 am – 7 pm'
);

create trigger site_settings_touch before update on public.site_settings
for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

create policy "anyone reads site settings" on public.site_settings for select using (true);
create policy "admins edit site settings" on public.site_settings for update
  using (public.is_admin()) with check (public.is_admin());
