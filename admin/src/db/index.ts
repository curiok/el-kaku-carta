import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '../supabaseClient';
import type {
  Category,
  Product,
  OptionGroup,
  BusinessSettings,
  LocalOrder,
  BackupData,
  OrderStatus,
  AdminAuthRecord
} from '../types';
import {
  initialCategories,
  initialProducts,
  initialOptionGroups,
  initialSettings
} from './seedData';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';


interface KakuDBSchema extends DBSchema {
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-order': number };
  };
  products: {
    key: string;
    value: Product;
    indexes: { 'by-category': string; 'by-order': number };
  };
  option_groups: {
    key: string;
    value: OptionGroup;
  };
  settings: {
    key: string;
    value: BusinessSettings & { id: string };
  };
  local_orders: {
    key: string;
    value: LocalOrder;
    indexes: { 'by-created': string; 'by-status': string };
  };
  auth: {
    key: string;
    value: AdminAuthRecord;
  };
}

const DB_NAME = 'kaku_admin_db';
const DB_VERSION = 2;
const SETTINGS_KEY = 'business_settings';
const AUTH_KEY = 'admin_auth';

let dbPromise: Promise<IDBPDatabase<KakuDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<KakuDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<KakuDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('by-order', 'sortOrder');
        }

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('by-category', 'categoryId');
          prodStore.createIndex('by-order', 'sortOrder');
        }

        // Option groups store
        if (!db.objectStoreNames.contains('option_groups')) {
          db.createObjectStore('option_groups', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Orders store
        if (!db.objectStoreNames.contains('local_orders')) {
          const orderStore = db.createObjectStore('local_orders', { keyPath: 'id' });
          orderStore.createIndex('by-created', 'createdAt');
          orderStore.createIndex('by-status', 'status');
        }

        // Auth store (v2)
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth', { keyPath: 'id' });
        }
      }
    }).then(async db => {
      // Check if DB is empty and seed initial data
      const catCount = await db.count('categories');
      if (catCount === 0) {
        const tx = db.transaction(
          ['categories', 'products', 'option_groups', 'settings'],
          'readwrite'
        );

        for (const cat of initialCategories) {
          await tx.objectStore('categories').put(cat);
        }
        for (const prod of initialProducts) {
          await tx.objectStore('products').put(prod);
        }
        for (const opt of initialOptionGroups) {
          await tx.objectStore('option_groups').put(opt);
        }
        await tx.objectStore('settings').put({ ...initialSettings, id: SETTINGS_KEY });

        await tx.done;
      }

      // Check if auth record exists, if not seed with initial requested credentials (curi / curiok)
      const existingAuth = await db.get('auth', AUTH_KEY);
      if (!existingAuth) {
        const salt = generateSalt();
        const passwordHash = await hashPassword('curiok', salt);
        await db.put('auth', {
          id: AUTH_KEY,
          username: 'curi',
          passwordHash,
          salt,
          updatedAt: new Date().toISOString()
        });
      }

      return db;
    });
  }

  return dbPromise;
}

/* ------------------- Categories ------------------- */
export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data)) {
      const cats: Category[] = data.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        sortOrder: c.sort_order,
        isActive: c.is_active
      }));

      // Cache into local IndexedDB
      try {
        const tx = db.transaction('categories', 'readwrite');
        await tx.objectStore('categories').clear();
        for (const cat of cats) {
          await tx.objectStore('categories').put(cat);
        }
        await tx.done;
      } catch (cacheErr) {
        console.warn('Could not cache categories to IndexedDB:', cacheErr);
      }

      return cats;
    }
  } catch (err) {
    console.warn('Supabase getCategories failed, falling back to IndexedDB:', err);
  }

  const all = await db.getAll('categories');
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveCategory(category: Category): Promise<void> {
  const row = {
    id: category.id,
    name: category.name,
    description: category.description || '',
    sort_order: category.sortOrder,
    is_active: category.isActive,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('categories').upsert([row], { onConflict: 'id' });
  if (error) {
    console.error('Error saving category to Supabase:', error);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  // Cache to IndexedDB only after Supabase confirms
  const db = await getDB();
  await db.put('categories', category);
}

export async function deleteCategory(id: string): Promise<{ success: boolean; reason?: string }> {
  const db = await getDB();
  // Check if any product is assigned to this category
  const prods = await db.getAllFromIndex('products', 'by-category', id);
  if (prods.length > 0) {
    return {
      success: false,
      reason: `No se puede eliminar: hay ${prods.length} producto(s) asignados a esta categoría. Reasignalos primero.`
    };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    console.error('Error deleting category from Supabase:', error);
    throw new Error(`Error al eliminar categoría en Supabase: ${error.message}`);
  }

  await db.delete('categories', id);
  return { success: true };
}

/* ------------------- Products ------------------- */
export async function getProducts(): Promise<Product[]> {
  const db = await getDB();
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data)) {
      const prods: Product[] = data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        basePrice: Number(p.base_price) || 0,
        categoryId: p.category_id,
        images: Array.isArray(p.images) ? p.images : [],
        mainImageIndex: 0,
        sortOrder: p.sort_order,
        isAvailable: p.is_available ?? true,
        optionGroupIds: Array.isArray(p.option_group_ids) ? p.option_group_ids : [],
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString()
      }));

      // Cache into local IndexedDB and purge any deleted products
      try {
        const tx = db.transaction('products', 'readwrite');
        await tx.objectStore('products').clear();
        for (const pr of prods) {
          await tx.objectStore('products').put(pr);
        }
        await tx.done;
      } catch (cacheErr) {
        console.warn('Could not cache products to IndexedDB:', cacheErr);
      }

      return prods;
    }
  } catch (err) {
    console.warn('Supabase getProducts failed, falling back to IndexedDB:', err);
  }

  const all = await db.getAll('products');
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveProduct(product: Product): Promise<void> {
  const row: Record<string, any> = {
    id: product.id,
    name: product.name,
    description: product.description || '',
    base_price: product.basePrice,
    category_id: product.categoryId,
    images: product.images || [],
    option_group_ids: product.optionGroupIds || [],
    is_available: product.isAvailable ?? true,
    sort_order: product.sortOrder,
    updated_at: new Date().toISOString()
  };
  if (product.createdAt) {
    row.created_at = product.createdAt;
  }

  const { error } = await supabase.from('products').upsert([row], { onConflict: 'id' });
  if (error) {
    console.error('Error saving product to Supabase:', error);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  // Cache to IndexedDB only after Supabase confirms
  const db = await getDB();
  await db.put('products', product);
}

export async function toggleProductAvailability(id: string, isAvailable: boolean): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      is_available: isAvailable,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating product availability in Supabase:', error);
    throw new Error(`Error al actualizar disponibilidad en Supabase: ${error.message}`);
  }

  const db = await getDB();
  const existing = await db.get('products', id);
  if (existing) {
    existing.isAvailable = isAvailable;
    existing.updatedAt = new Date().toISOString();
    await db.put('products', existing);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('Error deleting product from Supabase:', error);
    throw new Error(`Error al eliminar producto en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.delete('products', id);
}


/* ------------------- Option Groups ------------------- */
export async function getOptionGroups(): Promise<OptionGroup[]> {
  const db = await getDB();
  try {
    const { data, error } = await supabase
      .from('option_groups')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      const groups: OptionGroup[] = data.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        min: o.min,
        max: o.max,
        isRequired: o.is_required,
        isActive: o.is_active,
        options: o.options || []
      }));

      try {
        const tx = db.transaction('option_groups', 'readwrite');
        await tx.objectStore('option_groups').clear();
        for (const og of groups) {
          await tx.objectStore('option_groups').put(og);
        }
        await tx.done;
      } catch (cacheErr) {
        console.warn('Could not cache option groups to IndexedDB:', cacheErr);
      }

      return groups;
    }
  } catch (err) {
    console.warn('Supabase getOptionGroups failed, falling back to IndexedDB:', err);
  }

  return db.getAll('option_groups');
}

export async function saveOptionGroup(group: OptionGroup): Promise<void> {
  const row = {
    id: group.id,
    name: group.name,
    type: group.type,
    min: group.min,
    max: group.max,
    is_required: group.isRequired,
    is_active: group.isActive,
    options: group.options || [],
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('option_groups').upsert([row], { onConflict: 'id' });
  if (error) {
    console.error('Error saving option group to Supabase:', error);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.put('option_groups', group);
}

export async function deleteOptionGroup(id: string): Promise<void> {
  const { error } = await supabase.from('option_groups').delete().eq('id', id);
  if (error) {
    console.error('Error deleting option group from Supabase:', error);
    throw new Error(`Error al eliminar grupo en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.delete('option_groups', id);
}

/* ------------------- Settings ------------------- */
export async function getSettings(): Promise<BusinessSettings> {
  const db = await getDB();
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('id', 'business_settings')
      .maybeSingle();

    if (!error && data) {
      const isFree = (data.delivery_fee_mode ?? 'free') === 'free';
      const sett: BusinessSettings = {
        businessName: data.business_name || 'El Kaku',
        menuTitle: data.menu_title || 'Carta Digital El Kaku',
        whatsappNumber: data.whatsapp_number || '+54 9 3821 40-6662',
        currencySymbol: data.currency_symbol || '$',
        currencyFormat: data.currency_format || 'es-AR',
        deliveryEnabled: data.delivery_enabled ?? true,
        pickupEnabled: data.pickup_enabled ?? true,
        deliveryFeeMode: isFree ? 'free' : 'paid',
        deliveryFee: isFree ? 0 : (Number(data.delivery_fee) || 0),
        welcomeText: data.welcome_text || '',
        contactText: data.contact_text || '',
        theme: data.theme || initialSettings.theme,
        github: data.github || {
          repo: 'curiok/el-kaku-carta',
          branch: 'gh-pages',
          publicUrl: 'https://curiok.github.io/el-kaku-carta/'
        }
      };

      try {
        await db.put('settings', { ...sett, id: SETTINGS_KEY });
      } catch (cacheErr) {
        console.warn('Could not cache settings to IndexedDB:', cacheErr);
      }

      return sett;
    }
  } catch (err) {
    console.warn('Supabase getSettings failed, using IndexedDB fallback:', err);
  }

  const found = await db.get('settings', SETTINGS_KEY);
  if (!found) {
    const s = { ...initialSettings, id: SETTINGS_KEY };
    await db.put('settings', s);
    return initialSettings;
  }
  const { id: _, ...settings } = found;
  const typedSettings = settings as BusinessSettings;
  
  // Default to free delivery if not yet configured with deliveryFeeMode
  if (!typedSettings.deliveryFeeMode) {
    typedSettings.deliveryFeeMode = 'free';
    typedSettings.deliveryFee = 0;
  } else if (typedSettings.deliveryFeeMode === 'free') {
    typedSettings.deliveryFee = 0;
  }

  // Migrate github configuration to curiok/el-kaku-carta if pointing to old repo
  if (!typedSettings.github || typedSettings.github.repo?.includes('richardtn') || typedSettings.github.publicUrl?.includes('richardtn')) {
    typedSettings.github = {
      repo: 'curiok/el-kaku-carta',
      branch: 'gh-pages',
      publicUrl: 'https://curiok.github.io/el-kaku-carta/'
    };
    await db.put('settings', { ...typedSettings, id: SETTINGS_KEY });
  }

  return typedSettings;
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  const isFree = (settings.deliveryFeeMode ?? 'free') === 'free';
  const row = {
    id: 'business_settings',
    business_name: settings.businessName,
    menu_title: settings.menuTitle,
    whatsapp_number: settings.whatsappNumber,
    currency_symbol: settings.currencySymbol,
    currency_format: settings.currencyFormat,
    delivery_enabled: settings.deliveryEnabled,
    pickup_enabled: settings.pickupEnabled,
    delivery_fee_mode: isFree ? 'free' : 'paid',
    delivery_fee: isFree ? 0 : (Number(settings.deliveryFee) || 0),
    welcome_text: settings.welcomeText || '',
    contact_text: settings.contactText || '',
    theme: settings.theme,
    github: {
      repo: 'curiok/el-kaku-carta',
      branch: 'gh-pages',
      publicUrl: 'https://curiok.github.io/el-kaku-carta/'
    },
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('business_settings').upsert([row], { onConflict: 'id' });
  if (error) {
    console.error('Error saving settings to Supabase:', error);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.put('settings', { ...settings, id: SETTINGS_KEY });
}

/* ------------------- Orders ------------------- */
export async function getOrders(): Promise<LocalOrder[]> {
  const db = await getDB();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const orders: LocalOrder[] = data.map(o => ({
        id: o.id,
        createdAt: o.created_at,
        customerName: o.customer_name,
        deliveryType: o.delivery_type,
        address: o.address || undefined,
        items: o.items || [],
        subtotal: Number(o.subtotal) || 0,
        deliveryFee: Number(o.delivery_fee) || 0,
        total: Number(o.total) || 0,
        notes: o.notes || undefined,
        status: (o.status === 'pending' ? 'abierto_whatsapp' : o.status) as OrderStatus
      }));

      try {
        const tx = db.transaction('local_orders', 'readwrite');
        for (const ord of orders) {
          await tx.objectStore('local_orders').put(ord);
        }
        await tx.done;
      } catch {}

      return orders;
    }
  } catch (err) {
    console.warn('Supabase getOrders failed, fallback to IndexedDB:', err);
  }

  const orders = await db.getAll('local_orders');
  // Sort descending by creation date (newest first)
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveOrder(order: LocalOrder): Promise<void> {
  const sbStatus = order.status === 'abierto_whatsapp' ? 'pending' : order.status;
  const row = {
    id: order.id,
    customer_name: order.customerName,
    delivery_type: order.deliveryType,
    address: order.address || null,
    items: order.items || [],
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    total: order.total,
    status: sbStatus,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('orders').upsert([row], { onConflict: 'id' });
  if (error) {
    console.error('Error saving order to Supabase:', error);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.put('local_orders', order);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const sbStatus = status === 'abierto_whatsapp' ? 'pending' : status;
  const { error } = await supabase.from('orders').update({
    status: sbStatus,
    updated_at: new Date().toISOString()
  }).eq('id', id);

  if (error) {
    console.error('Error updating order status in Supabase:', error);
    throw new Error(`Error al actualizar estado en Supabase: ${error.message}`);
  }

  const db = await getDB();
  const order = await db.get('local_orders', id);
  if (order) {
    order.status = status;
    await db.put('local_orders', order);
  }
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) {
    console.error('Error deleting order from Supabase:', error);
    throw new Error(`Error al eliminar pedido en Supabase: ${error.message}`);
  }

  const db = await getDB();
  await db.delete('local_orders', id);
}


/* ------------------- Backup & Restore ------------------- */
export async function exportBackupData(): Promise<BackupData> {
  const [settings, categories, products, optionGroups, orders] = await Promise.all([
    getSettings(),
    getCategories(),
    getProducts(),
    getOptionGroups(),
    getOrders()
  ]);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    appName: 'El Kaku — Carta Digital',
    settings,
    categories,
    products,
    optionGroups,
    orders
  };
}

export async function importBackupData(backup: BackupData): Promise<{ success: boolean; message: string }> {
  if (!backup || !backup.version || !backup.categories || !backup.products) {
    throw new Error('El archivo de respaldo no es válido o está incompleto.');
  }

  const db = await getDB();
  const tx = db.transaction(
    ['categories', 'products', 'option_groups', 'settings', 'local_orders'],
    'readwrite'
  );

  // Clear existing
  await tx.objectStore('categories').clear();
  await tx.objectStore('products').clear();
  await tx.objectStore('option_groups').clear();
  await tx.objectStore('settings').clear();
  if (backup.orders) {
    await tx.objectStore('local_orders').clear();
  }

  // Insert imported
  for (const cat of backup.categories) {
    await tx.objectStore('categories').put(cat);
  }
  for (const prod of backup.products) {
    await tx.objectStore('products').put(prod);
  }
  if (backup.optionGroups) {
    for (const opt of backup.optionGroups) {
      await tx.objectStore('option_groups').put(opt);
    }
  }
  if (backup.settings) {
    await tx.objectStore('settings').put({ ...backup.settings, id: SETTINGS_KEY });
  }
  if (backup.orders) {
    for (const ord of backup.orders) {
      await tx.objectStore('local_orders').put(ord);
    }
  }

  await tx.done;

  return {
    success: true,
    message: `Respaldo importado con éxito: ${backup.categories.length} categorías, ${backup.products.length} productos.`
  };
}

/* ------------------- Admin Authentication ------------------- */
export async function getAuthRecord(): Promise<AdminAuthRecord> {
  const db = await getDB();
  let auth = await db.get('auth', AUTH_KEY);
  if (!auth) {
    const salt = generateSalt();
    const passwordHash = await hashPassword('curiok', salt);
    auth = {
      id: AUTH_KEY,
      username: 'curi',
      passwordHash,
      salt,
      updatedAt: new Date().toISOString()
    };
    await db.put('auth', auth);
  }
  return auth;
}

export async function validateCredentials(
  usernameAttempt: string,
  passwordAttempt: string
): Promise<boolean> {
  try {
    const auth = await getAuthRecord();
    const cleanUser = (usernameAttempt || '').trim();
    if (!cleanUser || cleanUser.toLowerCase() !== auth.username.toLowerCase()) {
      return false;
    }
    return await verifyPassword(passwordAttempt, auth.salt, auth.passwordHash);
  } catch (err) {
    console.error('Error al validar credenciales:', err);
    return false;
  }
}

export async function updateAdminCredentials(
  newUsername: string,
  newPassword: string
): Promise<void> {
  const db = await getDB();
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  const updatedAuth: AdminAuthRecord = {
    id: AUTH_KEY,
    username: newUsername.trim(),
    passwordHash,
    salt,
    updatedAt: new Date().toISOString()
  };
  await db.put('auth', updatedAuth);
}
