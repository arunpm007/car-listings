-- Starting catalogue of brands and models sold in India, including discontinued
-- ones that still turn up second-hand. The admin form adds missing models as it goes,
-- so this only needs to cover the common cases.

create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'));
$$;

with catalogue (brand, popular, models) as (
  values
    ('Maruti Suzuki', true, array['Alto', 'Alto 800', 'Alto K10', 'A-Star', 'Baleno', 'Brezza', 'Celerio', 'Ciaz', 'Dzire', 'Eeco', 'Ertiga', 'Esteem', 'Estilo', 'Fronx', 'Grand Vitara', 'Gypsy', 'Ignis', 'Invicto', 'Jimny', 'Omni', 'Ritz', 'S-Cross', 'S-Presso', 'Swift', 'SX4', 'Vitara Brezza', 'Wagon R', 'XL6', 'Zen', 'Zen Estilo', '800']),
    ('Hyundai', true, array['Accent', 'Alcazar', 'Aura', 'Creta', 'Elantra', 'Eon', 'Exter', 'Getz', 'Grand i10', 'Grand i10 Nios', 'i10', 'i20', 'i20 Active', 'Ioniq 5', 'Kona Electric', 'Santa Fe', 'Santro', 'Santro Xing', 'Sonata', 'Tucson', 'Venue', 'Verna', 'Xcent']),
    ('Tata', true, array['Altroz', 'Aria', 'Bolt', 'Curvv', 'Harrier', 'Hexa', 'Indica', 'Indigo', 'Indigo CS', 'Manza', 'Nano', 'Nexon', 'Nexon EV', 'Punch', 'Safari', 'Sumo', 'Tiago', 'Tigor', 'Xenon', 'Zest']),
    ('Mahindra', true, array['Bolero', 'Bolero Neo', 'KUV100', 'Logan', 'Marazzo', 'Quanto', 'Scorpio', 'Scorpio N', 'Scorpio Classic', 'Thar', 'TUV300', 'Verito', 'XUV300', 'XUV 3XO', 'XUV400', 'XUV500', 'XUV700', 'Xylo']),
    ('Toyota', true, array['Camry', 'Corolla', 'Corolla Altis', 'Etios', 'Etios Cross', 'Etios Liva', 'Fortuner', 'Glanza', 'Hilux', 'Hyryder', 'Innova', 'Innova Crysta', 'Innova Hycross', 'Land Cruiser', 'Qualis', 'Rumion', 'Urban Cruiser', 'Yaris']),
    ('Honda', true, array['Amaze', 'BR-V', 'Brio', 'City', 'Civic', 'CR-V', 'Elevate', 'Jazz', 'Mobilio', 'WR-V']),
    ('Kia', true, array['Carens', 'Carnival', 'EV6', 'Seltos', 'Sonet', 'Syros']),
    ('Renault', false, array['Captur', 'Duster', 'Fluence', 'Kiger', 'Kwid', 'Lodgy', 'Pulse', 'Scala', 'Triber']),
    ('Nissan', false, array['Kicks', 'Magnite', 'Micra', 'Micra Active', 'Sunny', 'Terrano', 'X-Trail']),
    ('Datsun', false, array['GO', 'GO Plus', 'redi-GO']),
    ('Volkswagen', false, array['Ameo', 'Jetta', 'Passat', 'Polo', 'Taigun', 'T-Roc', 'Tiguan', 'Vento', 'Virtus']),
    ('Skoda', false, array['Fabia', 'Kodiaq', 'Kushaq', 'Kylaq', 'Laura', 'Octavia', 'Rapid', 'Slavia', 'Superb', 'Yeti']),
    ('Ford', false, array['Aspire', 'EcoSport', 'Endeavour', 'Fiesta', 'Fiesta Classic', 'Figo', 'Freestyle', 'Ikon']),
    ('Chevrolet', false, array['Aveo', 'Aveo U-VA', 'Beat', 'Captiva', 'Cruze', 'Enjoy', 'Optra', 'Sail', 'Spark', 'Tavera', 'Trailblazer']),
    ('MG', false, array['Astor', 'Comet EV', 'Gloster', 'Hector', 'Hector Plus', 'Windsor EV', 'ZS EV']),
    ('Jeep', false, array['Compass', 'Grand Cherokee', 'Meridian', 'Wrangler']),
    ('Citroen', false, array['Aircross', 'Basalt', 'C3', 'C5 Aircross', 'eC3']),
    ('Fiat', false, array['Avventura', 'Grande Punto', 'Linea', 'Palio', 'Punto', 'Punto Evo']),
    ('Mitsubishi', false, array['Cedia', 'Lancer', 'Outlander', 'Pajero', 'Pajero Sport']),
    ('Isuzu', false, array['D-Max V-Cross', 'MU-7', 'MU-X']),
    ('Force', false, array['Gurkha', 'Trax', 'Trax Cruiser', 'Urbania']),
    ('Hindustan Motors', false, array['Ambassador', 'Contessa']),
    ('Mercedes-Benz', false, array['A-Class', 'C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'S-Class']),
    ('BMW', false, array['1 Series', '3 Series', '3 Series GT', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7']),
    ('Audi', false, array['A3', 'A4', 'A6', 'A8', 'Q2', 'Q3', 'Q5', 'Q7']),
    ('Volvo', false, array['S60', 'S90', 'XC40', 'XC60', 'XC90']),
    ('Land Rover', false, array['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar']),
    ('Jaguar', false, array['F-Pace', 'XE', 'XF', 'XJ']),
    ('Lexus', false, array['ES', 'LX', 'NX', 'RX']),
    ('Mini', false, array['Cooper', 'Cooper Countryman']),
    ('Porsche', false, array['911', 'Cayenne', 'Macan', 'Panamera']),
    ('BYD', false, array['Atto 3', 'e6', 'Seal']),
    ('Premier', false, array['Padmini', 'Rio']),
    ('Opel', false, array['Astra', 'Corsa'])
),
inserted_brands as (
  insert into public.brands (name, slug, popular)
  select brand, public.slugify(brand), popular from catalogue
  returning id, name
)
insert into public.models (brand_id, name, slug)
select b.id, m.name, public.slugify(m.name)
from catalogue c
join inserted_brands b on b.name = c.brand
cross join lateral unnest(c.models) as m(name);
