import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticMenuBundle } from './builder.js';
import { commitFilesToGitHub } from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  console.log('Iniciando despliegue de corrección PWA a GitHub Pages...');

  const envPath = path.resolve(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)[1].trim();
  const repo = 'curiok/el-kaku-carta';
  const branch = 'gh-pages';

  const defaultMenuPath = path.resolve(__dirname, '../public-menu/public/data/menu.json');
  let payload = {
    business: {
      name: 'El Kaku',
      menuTitle: 'Carta Digital El Kaku',
      whatsappNumber: '+54 9 3821 40-6662',
      currencySymbol: '$',
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFeeMode: 'free',
      deliveryFee: 0,
      welcomeText: '¡Bienvenidos a El Kaku! Sabores únicos, hamburguesas gourmet, lomitos y pizzas a la piedra.',
      contactText: 'San Martín 450 • Envíos a domicilio y retiro en mostrador'
    },
    categories: [],
    products: [],
    optionGroups: []
  };

  if (fs.existsSync(defaultMenuPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(defaultMenuPath, 'utf-8'));
    } catch (err) {
      console.warn('Error leyendo menu.json:', err);
    }
  }

  // Attempt to load fresh data directly from Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = 'https://ryynkvtvodiaaelkdyab.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const [catRes, prodRes, optRes, setRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('option_groups').select('*').order('sort_order', { ascending: true }),
      supabase.from('settings').select('*').limit(1).maybeSingle()
    ]);

    if (!catRes.error && catRes.data?.length > 0) {
      payload.categories = catRes.data.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        sortOrder: c.sort_order ?? 0,
        isActive: c.is_active ?? true
      }));
    }

    if (!prodRes.error && prodRes.data?.length > 0) {
      payload.products = prodRes.data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price ?? p.base_price ?? 0),
        categoryId: p.category_id,
        isAvailable: p.is_available ?? true,
        isFeatured: p.is_featured ?? false,
        images: Array.isArray(p.images) ? p.images : [],
        allergens: Array.isArray(p.allergens) ? p.allergens : [],
        labels: Array.isArray(p.labels) ? p.labels : [],
        optionGroupIds: Array.isArray(p.option_group_ids) ? p.option_group_ids : [],
        sortOrder: p.sort_order ?? 0
      }));
    }

    if (!optRes.error && optRes.data?.length > 0) {
      payload.optionGroups = optRes.data.map(og => ({
        id: og.id,
        name: og.name,
        minOptions: og.min_options ?? 0,
        maxOptions: og.max_options ?? 1,
        isRequired: og.is_required ?? false,
        isActive: og.is_active ?? true,
        sortOrder: og.sort_order ?? 0,
        options: Array.isArray(og.options) ? og.options : []
      }));
    }

    if (!setRes.error && setRes.data) {
      const s = setRes.data;
      payload.business = {
        name: s.business_name || payload.business.name,
        menuTitle: s.menu_title || payload.business.menuTitle,
        whatsappNumber: s.whatsapp_number || payload.business.whatsappNumber,
        currencySymbol: s.currency_symbol || payload.business.currencySymbol,
        deliveryEnabled: s.delivery_enabled ?? payload.business.deliveryEnabled,
        pickupEnabled: s.pickup_enabled ?? payload.business.pickupEnabled,
        deliveryFeeMode: s.delivery_fee_mode || payload.business.deliveryFeeMode,
        deliveryFee: s.delivery_fee_mode === 'paid' ? (Number(s.delivery_fee) || 0) : 0,
        welcomeText: s.welcome_text ?? payload.business.welcomeText,
        contactText: s.contact_text ?? payload.business.contactText,
        theme: s.theme || payload.business.theme
      };
    }

    console.log(`✓ Datos sincronizados desde Supabase (${payload.categories.length} categorías, ${payload.products.length} productos).`);
  } catch (syncErr) {
    console.warn('Nota: usando copia local de menu.json (error consultando Supabase:', syncErr.message, ')');
  }

  const bundle = await buildStaticMenuBundle(payload);
  console.log(`Bundle generado con ${bundle.files.length} archivos.`);

  const result = await commitFilesToGitHub({
    token,
    repo,
    branch,
    files: bundle.files,
    commitMessage: 'fix(admin): resolve product create/edit form submission and Supabase persistence'
  });

  console.log('✓ Despliegue completado con éxito!');
  console.log('✓ Commit SHA:', result.commitSha);
  console.log('✓ Archivos subidos:', result.filesCount);
}

deploy().catch(err => {
  console.error('Error durante el despliegue:', err);
  process.exit(1);
});
