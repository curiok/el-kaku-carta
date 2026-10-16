import { createClient } from '@supabase/supabase-js';
import type { PublicMenuData, Category, Product, OptionGroup } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ryynkvtvodiaaelkdyab.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Attempts to fetch active catalog data directly from Supabase in real-time.
 * Returns null if network is unavailable or tables not created yet,
 * enabling seamless offline fallback to ./data/menu.json.
 */
export async function fetchLiveMenuData(): Promise<PublicMenuData | null> {
  try {
    const [catsRes, prodsRes, optsRes, settsRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('products').select('*').eq('is_available', true).order('sort_order', { ascending: true }),
      supabase.from('option_groups').select('*').eq('is_active', true),
      supabase.from('business_settings').select('*').eq('id', 'business_settings').maybeSingle()
    ]);

    if (catsRes.error || prodsRes.error || optsRes.error) {
      return null;
    }

    if (!catsRes.data || catsRes.data.length === 0) {
      return null;
    }

    const allCategories: Category[] = catsRes.data.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      sortOrder: c.sort_order,
      isActive: c.is_active
    }));

    const products: Product[] = prodsRes.data.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      basePrice: Number(p.base_price) || 0,
      categoryId: p.category_id,
      images: p.images || [],
      mainImageIndex: p.main_image_index ?? 0,
      optionGroupIds: p.option_group_ids || [],
      isAvailable: p.is_available,
      sortOrder: p.sort_order
    }));

    // Only present categories that contain at least one available product
    const availableCategoryIds = new Set(products.map(p => p.categoryId));
    const categories = allCategories.filter(c => availableCategoryIds.has(c.id));

    const optionGroups: OptionGroup[] = optsRes.data.map(o => ({
      id: o.id,
      name: o.name,
      type: o.type,
      min: o.min,
      max: o.max,
      isRequired: o.is_required,
      isActive: o.is_active,
      options: o.options || []
    }));

    const s = settsRes.data;
    const isFree = (s?.delivery_fee_mode ?? 'free') === 'free';

    const business = {
      name: s?.business_name || 'El Kaku',
      menuTitle: s?.menu_title || 'Carta Digital El Kaku',
      whatsappNumber: s?.whatsapp_number || '+54 9 3821 40-6662',
      currencySymbol: s?.currency_symbol || '$',
      deliveryEnabled: s?.delivery_enabled ?? true,
      pickupEnabled: s?.pickup_enabled ?? true,
      deliveryFeeMode: (isFree ? 'free' : 'paid') as 'free' | 'paid',
      deliveryFee: isFree ? 0 : (Number(s?.delivery_fee) || 0),
      welcomeText: s?.welcome_text || '',
      contactText: s?.contact_text || '',
      theme: s?.theme || {
        primary: '#C99A16',
        secondary: '#F07819',
        background: '#17130D',
        surface: '#241D14',
        text: '#FFFDF8',
        accent: '#D93620'
      }
    };

    return {
      version: '1.0.0-supabase',
      generatedAt: new Date().toISOString(),
      business,
      categories,
      products,
      optionGroups
    };
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to menu.json:', err);
    return null;
  }
}

/**
 * Checks in real-time whether specific products are currently available in Supabase.
 */
export async function checkProductsAvailability(productIds: string[]): Promise<Record<string, boolean>> {
  if (!productIds || productIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, is_available')
      .in('id', productIds);

    if (error || !data) return {};
    const result: Record<string, boolean> = {};
    for (const row of data) {
      result[row.id] = Boolean(row.is_available);
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Subscribes to real-time changes on products, categories and business_settings.
 */
export function subscribeToMenuUpdates(onUpdate: () => void): () => void {
  try {
    const channel = supabase
      .channel('kaku-menu-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_settings' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

