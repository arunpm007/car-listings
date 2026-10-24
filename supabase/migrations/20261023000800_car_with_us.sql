-- Where the car is right now. Most cars stay with their owners until they sell (no yard),
-- so the default is "with the owner"; buyers then know a viewing has to be arranged.
alter table public.cars add column with_us boolean not null default false;

comment on column public.cars.with_us is 'true: the car (or its keys) is with the business and can be seen any time; false: with its owner, viewing by appointment';
