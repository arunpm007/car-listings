-- The type of car belongs to the model, not to each listing: every Swift is a hatchback.
-- The mediator never picks it per car, so it can't be set wrong. Pickups, vans and
-- coupes stay uncategorised and simply show under "All cars".

alter table public.models
  add column category text check (category in ('hatchback', 'sedan', 'suv', 'muv'));

with mapping (brand, category, names) as (
  values
    ('maruti-suzuki', 'hatchback', array['Alto', 'Alto 800', 'Alto K10', 'A-Star', 'Baleno', 'Celerio', 'Estilo', 'Ignis', 'Ritz', 'S-Presso', 'Swift', 'Wagon R', 'Zen', 'Zen Estilo', '800']),
    ('maruti-suzuki', 'sedan', array['Ciaz', 'Dzire', 'Esteem', 'SX4', 'Swift Dzire Tour']),
    ('maruti-suzuki', 'suv', array['Brezza', 'Fronx', 'Grand Vitara', 'Gypsy', 'Jimny', 'S-Cross', 'Vitara Brezza']),
    ('maruti-suzuki', 'muv', array['Eeco', 'Ertiga', 'Invicto', 'Omni', 'XL6']),

    ('hyundai', 'hatchback', array['Eon', 'Getz', 'Grand i10', 'Grand i10 Nios', 'i10', 'i20', 'i20 Active', 'Santro', 'Santro Xing']),
    ('hyundai', 'sedan', array['Accent', 'Aura', 'Elantra', 'Sonata', 'Verna', 'Xcent']),
    ('hyundai', 'suv', array['Alcazar', 'Creta', 'Exter', 'Ioniq 5', 'Kona Electric', 'Santa Fe', 'Tucson', 'Venue']),

    ('tata', 'hatchback', array['Altroz', 'Bolt', 'Indica', 'Nano', 'Tiago']),
    ('tata', 'sedan', array['Indigo', 'Indigo CS', 'Manza', 'Tigor', 'Zest']),
    ('tata', 'suv', array['Curvv', 'Harrier', 'Hexa', 'Nexon', 'Nexon EV', 'Punch', 'Safari']),
    ('tata', 'muv', array['Aria', 'Sumo']),

    ('mahindra', 'sedan', array['Logan', 'Verito']),
    ('mahindra', 'suv', array['Bolero', 'Bolero Neo', 'KUV100', 'Quanto', 'Scorpio', 'Scorpio N', 'Scorpio Classic', 'Thar', 'TUV300', 'XUV300', 'XUV 3XO', 'XUV400', 'XUV500', 'XUV700']),
    ('mahindra', 'muv', array['Marazzo', 'Xylo']),

    ('toyota', 'hatchback', array['Etios Cross', 'Etios Liva', 'Glanza']),
    ('toyota', 'sedan', array['Camry', 'Corolla', 'Corolla Altis', 'Etios', 'Yaris']),
    ('toyota', 'suv', array['Fortuner', 'Hyryder', 'Land Cruiser', 'Urban Cruiser']),
    ('toyota', 'muv', array['Innova', 'Innova Crysta', 'Innova Hycross', 'Qualis', 'Rumion']),

    ('honda', 'hatchback', array['Brio', 'Jazz']),
    ('honda', 'sedan', array['Amaze', 'City', 'Civic']),
    ('honda', 'suv', array['BR-V', 'CR-V', 'Elevate', 'WR-V']),
    ('honda', 'muv', array['Mobilio']),

    ('kia', 'suv', array['EV6', 'Seltos', 'Sonet', 'Syros']),
    ('kia', 'muv', array['Carens', 'Carnival']),

    ('renault', 'hatchback', array['Kwid', 'Pulse']),
    ('renault', 'sedan', array['Fluence', 'Scala']),
    ('renault', 'suv', array['Captur', 'Duster', 'Kiger']),
    ('renault', 'muv', array['Lodgy', 'Triber']),

    ('nissan', 'hatchback', array['Micra', 'Micra Active']),
    ('nissan', 'sedan', array['Sunny']),
    ('nissan', 'suv', array['Kicks', 'Magnite', 'Terrano', 'X-Trail']),

    ('datsun', 'hatchback', array['GO', 'redi-GO']),
    ('datsun', 'muv', array['GO Plus']),

    ('volkswagen', 'hatchback', array['Polo']),
    ('volkswagen', 'sedan', array['Ameo', 'Jetta', 'Passat', 'Vento', 'Virtus']),
    ('volkswagen', 'suv', array['Taigun', 'T-Roc', 'Tiguan']),

    ('skoda', 'hatchback', array['Fabia']),
    ('skoda', 'sedan', array['Laura', 'Octavia', 'Rapid', 'Slavia', 'Superb']),
    ('skoda', 'suv', array['Kodiaq', 'Kushaq', 'Kylaq', 'Yeti']),

    ('ford', 'hatchback', array['Figo', 'Freestyle']),
    ('ford', 'sedan', array['Aspire', 'Fiesta', 'Fiesta Classic', 'Ikon']),
    ('ford', 'suv', array['EcoSport', 'Endeavour']),

    ('chevrolet', 'hatchback', array['Aveo U-VA', 'Beat', 'Spark']),
    ('chevrolet', 'sedan', array['Aveo', 'Cruze', 'Optra', 'Sail']),
    ('chevrolet', 'suv', array['Captiva', 'Trailblazer']),
    ('chevrolet', 'muv', array['Enjoy', 'Tavera']),

    ('mg', 'hatchback', array['Comet EV']),
    ('mg', 'suv', array['Astor', 'Gloster', 'Hector', 'Hector Plus', 'Windsor EV', 'ZS EV']),

    ('jeep', 'suv', array['Compass', 'Grand Cherokee', 'Meridian', 'Wrangler']),

    ('citroen', 'hatchback', array['C3', 'eC3']),
    ('citroen', 'suv', array['Aircross', 'Basalt', 'C5 Aircross']),

    ('fiat', 'hatchback', array['Avventura', 'Grande Punto', 'Palio', 'Punto', 'Punto Evo']),
    ('fiat', 'sedan', array['Linea']),

    ('mitsubishi', 'sedan', array['Cedia', 'Lancer']),
    ('mitsubishi', 'suv', array['Outlander', 'Pajero', 'Pajero Sport']),

    ('isuzu', 'suv', array['MU-7', 'MU-X']),

    ('force', 'suv', array['Gurkha']),
    ('force', 'muv', array['Trax', 'Trax Cruiser']),

    ('hindustan-motors', 'sedan', array['Ambassador', 'Contessa']),

    ('mercedes-benz', 'sedan', array['A-Class', 'C-Class', 'E-Class', 'S-Class']),
    ('mercedes-benz', 'suv', array['GLA', 'GLC', 'GLE', 'GLS']),

    ('bmw', 'hatchback', array['1 Series']),
    ('bmw', 'sedan', array['3 Series', '3 Series GT', '5 Series', '7 Series']),
    ('bmw', 'suv', array['X1', 'X3', 'X5', 'X7']),

    ('audi', 'sedan', array['A3', 'A4', 'A6', 'A8']),
    ('audi', 'suv', array['Q2', 'Q3', 'Q5', 'Q7']),

    ('volvo', 'sedan', array['S60', 'S90']),
    ('volvo', 'suv', array['XC40', 'XC60', 'XC90']),

    ('land-rover', 'suv', array['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar']),

    ('jaguar', 'sedan', array['XE', 'XF', 'XJ']),
    ('jaguar', 'suv', array['F-Pace']),

    ('lexus', 'sedan', array['ES']),
    ('lexus', 'suv', array['LX', 'NX', 'RX']),

    ('mini', 'hatchback', array['Cooper']),
    ('mini', 'suv', array['Cooper Countryman']),

    ('porsche', 'sedan', array['Panamera']),
    ('porsche', 'suv', array['Cayenne', 'Macan']),

    ('byd', 'sedan', array['Seal']),
    ('byd', 'suv', array['Atto 3']),
    ('byd', 'muv', array['e6']),

    ('premier', 'sedan', array['Padmini']),
    ('premier', 'suv', array['Rio']),

    ('opel', 'sedan', array['Astra', 'Corsa'])
)
update public.models m
set category = x.category
from (
  select b.id as brand_id, mp.category, unnest(mp.names) as name
  from mapping mp
  join public.brands b on b.slug = mp.brand
) x
where m.brand_id = x.brand_id and m.name = x.name;

-- Each listing now takes its type from the model.
alter table public.cars drop column body_type;
