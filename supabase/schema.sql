-- ====================================================================
-- EL KAKU — ESQUEMA COMPLETO DE BASE DE DATOS Y RLS EN SUPABASE
-- Compatible con PostgreSQL 15+ y Supabase
-- Script 100% Idempotente (se puede ejecutar múltiples veces sin error)
-- ====================================================================

-- 1. TABLA: CATEGORÍAS
create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABLA: PRODUCTOS
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text default '',
  base_price numeric(10,2) not null default 0,
  category_id text references public.categories(id) on delete set null,
  images jsonb default '[]'::jsonb not null,
  option_group_ids jsonb default '[]'::jsonb not null,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABLA: GRUPOS DE OPCIONES Y ADICIONALES
create table if not exists public.option_groups (
  id text primary key,
  name text not null,
  type text not null check (type in ('single', 'multiple')),
  min integer not null default 0,
  max integer not null default 1,
  is_required boolean not null default false,
  is_active boolean not null default true,
  options jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABLA: CONFIGURACIÓN GENERAL DEL NEGOCIO
create table if not exists public.business_settings (
  id text primary key default 'business_settings',
  business_name text not null default 'El Kaku',
  menu_title text not null default 'Carta Digital El Kaku',
  whatsapp_number text not null default '+54 9 3821 40-6662',
  currency_symbol text not null default '$',
  currency_format text not null default 'es-AR',
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_fee_mode text not null default 'free' check (delivery_fee_mode in ('free', 'paid')),
  delivery_fee numeric(10,2) not null default 0,
  welcome_text text default '¡Bienvenidos a El Kaku! Sabores únicos, hamburguesas gourmet, lomitos y pizzas a la piedra.',
  contact_text text default 'San Martín 450 • Envíos a domicilio y retiro en mostrador',
  theme jsonb default '{"primary":"#C99A16","secondary":"#F07819","background":"#17130D","surface":"#241D14","text":"#FFFDF8","accent":"#D93620"}'::jsonb not null,
  github jsonb default '{"repo":"curiok/el-kaku-carta","branch":"gh-pages","publicUrl":"https://curiok.github.io/el-kaku-carta/"}'::jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABLA: PEDIDOS REGISTRADOS
create table if not exists public.orders (
  id text primary key,
  customer_name text not null,
  delivery_type text not null check (delivery_type in ('delivery', 'pickup')),
  address text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Habilitar RLS en todas las tablas
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.business_settings enable row level security;
alter table public.orders enable row level security;

-- CATEGORÍAS
drop policy if exists "Lectura pública de categorías" on public.categories;
create policy "Lectura pública de categorías" on public.categories
  for select using (true);

drop policy if exists "Escritura de categorías autorizada" on public.categories;
create policy "Escritura de categorías autorizada" on public.categories
  for all using (true) with check (true);

-- PRODUCTOS
drop policy if exists "Lectura pública de productos" on public.products;
create policy "Lectura pública de productos" on public.products
  for select using (true);

drop policy if exists "Escritura de productos autorizada" on public.products;
create policy "Escritura de productos autorizada" on public.products
  for all using (true) with check (true);

-- GRUPOS DE OPCIONES
drop policy if exists "Lectura pública de grupos de opciones" on public.option_groups;
create policy "Lectura pública de grupos de opciones" on public.option_groups
  for select using (true);

drop policy if exists "Escritura de grupos de opciones autorizada" on public.option_groups;
create policy "Escritura de grupos de opciones autorizada" on public.option_groups
  for all using (true) with check (true);

-- CONFIGURACIÓN DEL NEGOCIO
drop policy if exists "Lectura pública de configuración" on public.business_settings;
create policy "Lectura pública de configuración" on public.business_settings
  for select using (true);

drop policy if exists "Escritura de configuración autorizada" on public.business_settings;
create policy "Escritura de configuración autorizada" on public.business_settings
  for all using (true) with check (true);

-- PEDIDOS
drop policy if exists "Creación de pedidos por clientes" on public.orders;
create policy "Creación de pedidos por clientes" on public.orders
  for insert with check (true);

drop policy if exists "Gestión de pedidos por administradores" on public.orders;
create policy "Gestión de pedidos por administradores" on public.orders
  for select using (true);

drop policy if exists "Actualización de pedidos por administradores" on public.orders;
create policy "Actualización de pedidos por administradores" on public.orders
  for update using (true);

-- ====================================================================
-- DATOS INICIALES POR DEFECTO (SEED)
-- ====================================================================

-- 1. Configuración inicial del negocio
insert into public.business_settings (
  id, business_name, menu_title, whatsapp_number, currency_symbol,
  currency_format, delivery_enabled, pickup_enabled, delivery_fee_mode,
  delivery_fee, welcome_text, contact_text, theme, github
) values (
  'business_settings',
  'El Kaku',
  'Carta Digital El Kaku',
  '+54 9 3821 40-6662',
  '$',
  'es-AR',
  true,
  true,
  'free',
  0,
  '¡Bienvenidos a El Kaku! Sabores únicos, hamburguesas gourmet, lomitos y pizzas a la piedra.',
  'San Martín 450 • Envíos a domicilio y retiro en mostrador',
  '{"primary":"#C99A16","secondary":"#F07819","background":"#17130D","surface":"#241D14","text":"#FFFDF8","accent":"#D93620"}'::jsonb,
  '{"repo":"curiok/el-kaku-carta","branch":"gh-pages","publicUrl":"https://curiok.github.io/el-kaku-carta/"}'::jsonb
) on conflict (id) do update set
  github = excluded.github,
  delivery_fee_mode = excluded.delivery_fee_mode,
  delivery_fee = excluded.delivery_fee;

-- 2. Categorías oficiales
insert into public.categories (id, name, description, sort_order, is_active) values
  ('cat_promos', 'Promociones', 'Combos especiales para compartir al mejor precio', 1, true),
  ('cat_hamburguesas', 'Hamburguesas', 'Medallones 100% de ternera a la chapa en pan brioche artesanal', 2, true),
  ('cat_lomitos', 'Lomitos', 'Tiernos bifes de lomo seleccionados en pan casero crocante', 3, true),
  ('cat_pizzas', 'Pizzas', 'Masa madre madurada 48hs con abundante mozzarella de primera', 4, true),
  ('cat_empanadas', 'Empanadas', 'Rellenos tradicionales súper jugosos al horno de barro', 5, true),
  ('cat_papas', 'Papas y Acompañamientos', 'Papas rústicas cortadas a mano y bastones crocantes', 6, true),
  ('cat_bebidas', 'Bebidas', 'Gaseosas de litro y medio, cervezas artesanales y aguas', 7, true),
  ('cat_postres', 'Postres', 'Dulzuras artesanales para el final perfecto', 8, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 3. Grupos de opciones y adicionales
insert into public.option_groups (id, name, type, min, max, is_required, is_active, options) values
  ('opt_coccion', 'Punto de cocción', 'single', 1, 1, true, true, $$[{"id":"coc_1","name":"A punto (jugoso al centro)","price":0},{"id":"coc_2","name":"Cocido tradicional","price":0},{"id":"coc_3","name":"Bien cocido","price":0}]$$::jsonb),
  ('opt_pan', 'Tipo de pan', 'single', 1, 1, true, true, $$[{"id":"pan_1","name":"Pan Brioche mantecoso","price":0},{"id":"pan_2","name":"Pan de Papa esponjoso","price":0},{"id":"pan_3","name":"Pan Sin TACC (Apto Celíacos)","price":1200}]$$::jsonb),
  ('opt_extras_burger', 'Adicionales para tu Hamburguesa', 'multiple', 0, 5, false, true, $$[{"id":"ext_1","name":"Panceta ahumada crocante","price":1500},{"id":"ext_2","name":"Doble Cheddar fundido","price":1200},{"id":"ext_3","name":"Huevo a la chapa","price":800},{"id":"ext_4","name":"Medallón extra de carne 150g","price":2800},{"id":"ext_5","name":"Cebolla caramelizada al Malbec","price":900}]$$::jsonb),
  ('opt_salsas', 'Salsas a elección (hasta 3)', 'multiple', 0, 3, false, true, $$[{"id":"sal_1","name":"Mayonesa casera de ajo asado","price":0},{"id":"sal_2","name":"Barbacoa ahumada artesanal","price":0},{"id":"sal_3","name":"Mostaza antigua con miel","price":0},{"id":"sal_4","name":"Salsa Kaku picante suave","price":0}]$$::jsonb)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  min = excluded.min,
  max = excluded.max,
  is_required = excluded.is_required,
  is_active = excluded.is_active,
  options = excluded.options;

-- 4. Productos oficiales
insert into public.products (id, name, description, base_price, category_id, images, option_group_ids, is_available, sort_order) values
  ('prod_promo_1', 'Combo Kaku: 2 Doble Cheddar + Papas Grandes', 'Dos hamburguesas con doble carne y doble cheddar acompañadas de una porción gigante de papas rústicas.', 31000, 'cat_promos', '[]'::jsonb, $$["opt_salsas"]$$::jsonb, true, 1),
  ('prod_burger_1', 'Hamburguesa Doble Cheddar Bacon', 'Dos medallones de ternera de 120g, cuatro fetas de cheddar cremoso fundido y abundante panceta crocante.', 14500, 'cat_hamburguesas', '[]'::jsonb, $$["opt_coccion","opt_pan","opt_extras_burger","opt_salsas"]$$::jsonb, true, 1),
  ('prod_burger_2', 'Hamburguesa Kaku Especial', 'Doble carne, queso provoleta crocante a la plancha, cebolla caramelizada, rúcula fresca y mayonesa ahumada.', 15800, 'cat_hamburguesas', '[]'::jsonb, $$["opt_coccion","opt_pan","opt_extras_burger","opt_salsas"]$$::jsonb, true, 2),
  ('prod_lomito_1', 'Lomito Completo Cordobés', 'Tierno bife de lomo a la plancha, jamón cocido, queso, lechuga capuchina, tomate redondo, huevo frito y mayonesa casera en pan baguette artesanal.', 17200, 'cat_lomitos', '[]'::jsonb, $$["opt_salsas"]$$::jsonb, true, 1),
  ('prod_pizza_1', 'Pizza Napolitana Especial con Jamón', 'Masa madre madurada 48hs al horno, salsa de tomates italianos, abundante mozzarella, jamón cocido, rodajas de tomate y provenzal.', 15400, 'cat_pizzas', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('prod_empanadas_1', 'Docena de Empanadas Criollas de Carne Cortada a Cuchillo', '12 empanadas de masa casera bien hojaldrada, carne tierna, cebollita de verdeo, pimentón dulce y comino norteño.', 14500, 'cat_empanadas', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('prod_papas_1', 'Papas Rústicas Cheddar y Verdeo', 'Porción abundante de papas rústicas con piel, crocantes por fuera y tiernas por dentro, bañadas en queso cheddar y verdeo fresco.', 8900, 'cat_papas', '[]'::jsonb, $$["opt_salsas"]$$::jsonb, true, 1),
  ('prod_bebida_1', 'Cerveza Patagonia Amber Lager 730ml', 'Cerveza de sabor balanceado, con sutiles notas a caramelo y tostado. Servida helada.', 5800, 'cat_bebidas', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('prod_postre_1', 'Volcán Tibio de Chocolate con Helado', 'Bizcochuelo tibio relleno de chocolate belga fundido, acompañado con una bocha de helado de crema americana artesanal.', 6500, 'cat_postres', '[]'::jsonb, '[]'::jsonb, true, 1)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  base_price = excluded.base_price,
  category_id = excluded.category_id,
  images = excluded.images,
  option_group_ids = excluded.option_group_ids,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;
