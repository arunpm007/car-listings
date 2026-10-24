-- Demo cars for local development only (`supabase db reset` loads this).
-- Hosted projects never run it unless you pass --include-seed.

create temporary table demo_cars as
select * from (
  values
    ('listed',   'maruti-suzuki', 'swift',         'VXI',            2018, 'petrol', 'manual',    42000, 1, 'White',  'KA-12', '2027-03-14', 420000,  true,  'Madikeri',          'Single owner, full service history at authorised centre. New tyres.', true),
    ('listed',   'hyundai',       'creta',         'SX 1.6 CRDi',    2017, 'diesel', 'manual',    88000, 2, 'Silver', 'KA-09', '2027-01-02', 925000,  true,  'Kushalnagar',       'Sunroof, touchscreen, rear camera. Minor scratch on rear bumper.', true),
    ('listed',   'toyota',        'innova-crysta', '2.4 VX 7 STR',   2019, 'diesel', 'manual',    120000, 1, 'Grey',  'KA-12', '2026-12-20', 1650000, false, 'Virajpet',          'Family-used, never commercial. Captain seats.', false),
    ('reserved', 'honda',         'city',          'V MT',           2016, 'petrol', 'manual',    67000, 2, 'Red',    'KA-12', '2027-05-01', 515000,  true,  'Gonikoppal',      'Token received, test drive available until final payment.', false),
    ('listed',   'tata',          'nexon',         'XZ+ AMT',        2021, 'petrol', 'automatic', 31000, 1, 'Blue',   'KA-12', '2027-08-09', 795000,  true,  'Madikeri', 'Automatic, 5-star safety, under extended warranty.', false),
    ('sold',     'maruti-suzuki', 'wagon-r',       'LXI CNG',        2015, 'cng',    'manual',    98000, 2, 'Silver', 'KA-12', null,         260000,  true,  'Somwarpet',          null, false),
    ('sold',     'mahindra',      'scorpio',       'S10',            2014, 'diesel', 'manual',    140000, 2, 'Black', 'KA-09', null,         640000,  true,  'Kushalnagar',       null, false),
    ('submitted','renault',       'kwid',          'RXT 1.0',        2019, 'petrol', 'manual',    36000, 1, 'Orange', 'KA-12', null,         290000,  true,  'Madikeri',          'Seller sent photos on WhatsApp; inspection pending.', false)
) as v(status, brand, model, variant, year, fuel, transmission, km, owners, color, rto, insurance, price, negotiable, location, description, featured);

-- The area is private, so it goes with the owner details (matched by variant, unique here).
with inserted as (
  insert into public.cars (status, brand_id, model_id, variant, year, fuel, transmission, km_driven, owners, color, rto, insurance_valid_until, price, negotiable, description, featured)
  select v.status, b.id, m.id, v.variant, v.year, v.fuel, v.transmission, v.km, v.owners, v.color, v.rto, v.insurance::date, v.price, v.negotiable, v.description, v.featured
  from demo_cars v
  join public.brands b on b.slug = v.brand
  join public.models m on m.brand_id = b.id and m.slug = v.model
  returning id, variant, price
)
insert into public.car_private (car_id, seller_name, seller_phone, reg_number, seller_min_price, location, notes)
select i.id, 'Demo seller ' || i.id, '+91 90000 0000' || i.id, 'KA-12-AB-' || lpad((1000 + i.id)::text, 4, '0'), i.price - 20000, v.location, 'Demo row'
from inserted i
join demo_cars v on v.variant = i.variant;
