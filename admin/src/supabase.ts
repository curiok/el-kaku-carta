import { createClient } from '@supabase/supabase-js';
import type { Category, Product, OptionGroup, BusinessSettings, LocalOrder } from './types';
import {
  getCategories,
  saveCategory,
  getProducts,
  saveProduct,
  getOptionGroups,
  saveOptionGroup,
  getSettings,
  saveSettings
} from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ryynkvtvodiaaelkdyab.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Checks if Supabase tables are ready and accessible.
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('categories').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
        return {
          connected: false,
          message: 'Conectado a Supabase pero las tablas aún no fueron creadas. Pegá supabase/schema.sql en el SQL Editor.'
        };
      }
      return { connected: false, message: error.message };
    }
    return { connected: true, message: 'Conectado a Supabase (Sincronización en tiempo real activa)' };
  } catch (err: any) {
    return { connected: false, message: err.message || 'Error de red con Supabase' };
  }
}

/**
 * Pushes all local IndexedDB data to Supabase (Sync Up).
 */
export async function syncAllToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const [cats, prods, opts, setts] = await Promise.all([
      getCategories(),
      getProducts(),
      getOptionGroups(),
      getSettings()
    ]);

    // 1. Categories
    if (cats.length > 0) {
      const catRows = cats.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        sort_order: c.sortOrder,
        is_active: c.isActive,
        updated_at: new Date().toISOString()
      }));
      const { error: catErr } = await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
      if (catErr) throw catErr;
    }

    // 2. Option Groups
    if (opts.length > 0) {
      const optRows = opts.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        min: o.min,
        max: o.max,
        is_required: o.isRequired,
        is_active: o.isActive,
        options: o.options || [],
        updated_at: new Date().toISOString()
      }));
      const { error: optErr } = await supabase.from('option_groups').upsert(optRows, { onConflict: 'id' });
      if (optErr) throw optErr;
    }

    // 3. Products
    if (prods.length > 0) {
      const prodRows = prods.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        base_price: p.basePrice,
        category_id: p.categoryId,
        images: p.images || [],
        option_group_ids: p.optionGroupIds || [],
        is_available: p.isAvailable,
        sort_order: p.sortOrder,
        updated_at: new Date().toISOString()
      }));
      const { error: prodErr } = await supabase.from('products').upsert(prodRows, { onConflict: 'id' });
      if (prodErr) throw prodErr;
    }

    // 4. Business Settings
    const isFree = (setts.deliveryFeeMode ?? 'free') === 'free';
    const settRow = {
      id: 'business_settings',
      business_name: setts.businessName,
      menu_title: setts.menuTitle,
      whatsapp_number: setts.whatsappNumber,
      currency_symbol: setts.currencySymbol,
      currency_format: setts.currencyFormat,
      delivery_enabled: setts.deliveryEnabled,
      pickup_enabled: setts.pickupEnabled,
      delivery_fee_mode: isFree ? 'free' : 'paid',
      delivery_fee: isFree ? 0 : (Number(setts.deliveryFee) || 0),
      welcome_text: setts.welcomeText || '',
      contact_text: setts.contactText || '',
      theme: setts.theme,
      github: {
        repo: 'curiok/el-kaku-carta',
        branch: 'gh-pages',
        publicUrl: 'https://curiok.github.io/el-kaku-carta/'
      },
      updated_at: new Date().toISOString()
    };
    const { error: settErr } = await supabase.from('business_settings').upsert([settRow], { onConflict: 'id' });
    if (settErr) throw settErr;

    const totalCount = cats.length + prods.length + opts.length + 1;
    return { success: true, count: totalCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Pulls latest data from Supabase into local IndexedDB (Sync Down).
 */
export async function pullFromSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const [catsRes, prodsRes, optsRes, settsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('option_groups').select('*'),
      supabase.from('business_settings').select('*').eq('id', 'business_settings').maybeSingle()
    ]);

    if (catsRes.error) throw catsRes.error;
    if (prodsRes.error) throw prodsRes.error;
    if (optsRes.error) throw optsRes.error;

    let count = 0;

    if (catsRes.data && catsRes.data.length > 0) {
      for (const row of catsRes.data) {
        await saveCategory({
          id: row.id,
          name: row.name,
          description: row.description || '',
          sortOrder: row.sort_order,
          isActive: row.is_active
        });
        count++;
      }
    }

    if (optsRes.data && optsRes.data.length > 0) {
      for (const row of optsRes.data) {
        await saveOptionGroup({
          id: row.id,
          name: row.name,
          type: row.type,
          min: row.min,
          max: row.max,
          isRequired: row.is_required,
          isActive: row.is_active,
          options: row.options || []
        });
        count++;
      }
    }

    if (prodsRes.data && prodsRes.data.length > 0) {
      for (const row of prodsRes.data) {
        await saveProduct({
          id: row.id,
          name: row.name,
          description: row.description || '',
          basePrice: Number(row.base_price) || 0,
          categoryId: row.category_id,
          images: row.images || [],
          mainImageIndex: row.main_image_index ?? 0,
          optionGroupIds: row.option_group_ids || [],
          isAvailable: row.is_available,
          sortOrder: row.sort_order,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString()
        });
        count++;
      }
    }

    if (settsRes.data) {
      const row = settsRes.data;
      await saveSettings({
        businessName: row.business_name,
        menuTitle: row.menu_title,
        whatsappNumber: row.whatsapp_number,
        currencySymbol: row.currency_symbol,
        currencyFormat: row.currency_format,
        deliveryEnabled: row.delivery_enabled,
        pickupEnabled: row.pickup_enabled,
        deliveryFeeMode: row.delivery_fee_mode || 'free',
        deliveryFee: Number(row.delivery_fee) || 0,
        welcomeText: row.welcome_text,
        contactText: row.contact_text,
        theme: row.theme,
        github: {
          repo: 'curiok/el-kaku-carta',
          branch: 'gh-pages',
          publicUrl: 'https://curiok.github.io/el-kaku-carta/'
        }
      });
      count++;
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}
