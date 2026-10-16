-- ====================================================================
-- EL KAKU — DATOS INICIALES (SEED) PARA SUPABASE
-- Compatible con PostgreSQL 15+ y Supabase
-- ====================================================================

-- 1. Categorías oficiales
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

-- 2. Grupos de opciones y adicionales
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

-- 3. Productos oficiales
insert into public.products (id, name, description, base_price, category_id, images, option_group_ids, is_available, sort_order) values
  ('prod_mv98ikeq_nc30u', 'X2 HAMBURGUESAS SIMPLE', '', 9000, 'cat_promos', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('prod_mv8mtbpn_1to0t', 'Hamburguesa simple COMPLETA', '', 5000, 'cat_hamburguesas', '[]'::jsonb, '[]'::jsonb, true, 2),
  ('prod_mv8mxfys_yn8uz', 'Hamburguesa DOBLE COMPLETA', '', 6000, 'cat_hamburguesas', '[]'::jsonb, '[]'::jsonb, true, 3),
  ('prod_mv8mufoq_k8a8x', 'Hamburguesa Doble TODO', '', 7000, 'cat_hamburguesas', '[]'::jsonb, '[]'::jsonb, true, 4),
  ('prod_mv8n35i7_ci3qh', 'LOMITO CON PAPAS', '', 10000, 'cat_lomitos', '[]'::jsonb, '[]'::jsonb, true, 5)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  base_price = excluded.base_price,
  category_id = excluded.category_id,
  images = excluded.images,
  option_group_ids = excluded.option_group_ids,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;

