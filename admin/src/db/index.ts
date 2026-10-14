import { openDB, DBSchema, IDBPDatabase } from 'idb';
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
  const all = await db.getAll('categories');
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveCategory(category: Category): Promise<void> {
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
  await db.delete('categories', id);
  return { success: true };
}

/* ------------------- Products ------------------- */
export async function getProducts(): Promise<Product[]> {
  const db = await getDB();
  const all = await db.getAll('products');
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveProduct(product: Product): Promise<void> {
  const db = await getDB();
  await db.put('products', product);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

/* ------------------- Option Groups ------------------- */
export async function getOptionGroups(): Promise<OptionGroup[]> {
  const db = await getDB();
  return db.getAll('option_groups');
}

export async function saveOptionGroup(group: OptionGroup): Promise<void> {
  const db = await getDB();
  await db.put('option_groups', group);
}

export async function deleteOptionGroup(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('option_groups', id);
}

/* ------------------- Settings ------------------- */
export async function getSettings(): Promise<BusinessSettings> {
  const db = await getDB();
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
  const db = await getDB();
  await db.put('settings', { ...settings, id: SETTINGS_KEY });
}

/* ------------------- Orders ------------------- */
export async function getOrders(): Promise<LocalOrder[]> {
  const db = await getDB();
  const orders = await db.getAll('local_orders');
  // Sort descending by creation date (newest first)
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveOrder(order: LocalOrder): Promise<void> {
  const db = await getDB();
  await db.put('local_orders', order);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const db = await getDB();
  const order = await db.get('local_orders', id);
  if (order) {
    order.status = status;
    await db.put('local_orders', order);
  }
}

export async function deleteOrder(id: string): Promise<void> {
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
