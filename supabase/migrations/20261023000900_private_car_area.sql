-- A car's area (e.g. "Kushalnagar") hints at where the owner lives, so it moves off the public
-- cars row into car_private. The website only shows it when Settings → "show each car's area"
-- is on, and then the server adds it to the page itself.
alter table public.car_private add column location text;

insert into public.car_private (car_id, location)
select id, location from public.cars where location is not null
on conflict (car_id) do update set location = excluded.location;

alter table public.cars drop column location;
