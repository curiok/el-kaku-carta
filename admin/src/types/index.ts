export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OptionChoice {
  id: string;
  name: string;
  price: number; // integer in ARS
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  min: number;
  max: number;
  isRequired: boolean;
  isActive: boolean;
  options: OptionChoice[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  categoryId: string;
  images: string[]; // Base64 Data URL or relative image path
  mainImageIndex: number;
  sortOrder: number;
  isAvailable: boolean; // active or paused
  optionGroupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  additionalPrice: number;
}

export interface CartItem {
  cartItemId: string; // unique hash/id based on product + option selection
  productId: string;
  productName: string;
  productImage: string;
  unitBasePrice: number;
  unitFinalPrice: number;
  quantity: number;
  selectedOptions: CartItemOption[];
  subtotal: number;
}

export type OrderStatus = 'preparado' | 'abierto_whatsapp' | 'revisado' | 'cancelado';
export type DeliveryType = 'delivery' | 'pickup';

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  unitBasePrice: number;
  quantity: number;
  selectedOptions: CartItemOption[];
  subtotal: number;
}

export interface LocalOrder {
  id: string; // KAKU-XXXXXX
  createdAt: string;
  customerName: string;
  deliveryType: DeliveryType;
  address?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  status: OrderStatus;
  rawWhatsappMessage?: string;
}

export interface BusinessTheme {
  primary: string; // e.g. #f59e0b (Amber/gold gastronomy)
  secondary: string; // e.g. #dc2626 (Warm red/flame)
  background: string; // e.g. #111418 (Dark charcoal)
  surface: string; // e.g. #1a1f26 (Elevated card)
  text: string; // e.g. #f3f4f6 (White/light gray)
  accent: string; // e.g. #10b981 (WhatsApp green accent)
}

export interface BusinessSettings {
  businessName: string;
  menuTitle: string;
  whatsappNumber: string; // e.g. +54 9 3821 40-6662
  currencySymbol: string;
  currencyFormat: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeMode?: 'free' | 'paid';
  deliveryFee: number;
  welcomeText: string;
  contactText: string;
  theme: BusinessTheme;
  github: {
    repo: string;
    branch: string;
    publicUrl: string;
  };
}

export interface PublicMenuData {
  version: string;
  generatedAt: string;
  business: {
    name: string;
    menuTitle: string;
    whatsappNumber: string;
    currencySymbol: string;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    deliveryFeeMode?: 'free' | 'paid';
    deliveryFee: number;
    welcomeText: string;
    contactText: string;
    theme: BusinessTheme;
  };
  categories: Category[];
  products: Product[];
  optionGroups: OptionGroup[];
}

export interface BackupData {
  version: string;
  exportedAt: string;
  appName: string;
  settings: BusinessSettings;
  categories: Category[];
  products: Product[];
  optionGroups: OptionGroup[];
  orders: LocalOrder[];
}

export interface AdminAuthRecord {
  id: 'admin_auth';
  username: string;
  passwordHash: string;
  salt: string;
  updatedAt: string;
}
