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
  price: number;
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
  images: string[];
  mainImageIndex: number;
  sortOrder: number;
  isAvailable: boolean;
  optionGroupIds: string[];
}

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  additionalPrice: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  productImage: string;
  unitBasePrice: number;
  unitFinalPrice: number;
  quantity: number;
  selectedOptions: CartItemOption[];
  subtotal: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export interface BusinessTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
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

export interface OrderCustomerInfo {
  customerName: string;
  deliveryType: DeliveryType;
  address?: string;
  notes?: string;
}
