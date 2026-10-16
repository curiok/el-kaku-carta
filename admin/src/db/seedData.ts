import type { BusinessSettings, Category, OptionGroup, Product } from '../types';

export const initialSettings: BusinessSettings = {
  businessName: 'El Kaku',
  menuTitle: 'Carta Digital El Kaku',
  whatsappNumber: '+54 9 3821 40-6662',
  currencySymbol: '$',
  currencyFormat: 'es-AR',
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFeeMode: 'free',
  deliveryFee: 0,
  welcomeText: '¡Bienvenidos a El Kaku! Sabores únicos, hamburguesas gourmet, lomitos y pizzas a la piedra.',
  contactText: 'San Martín 450 • Envíos a domicilio y retiro en local',
  theme: {
    primary: '#C99A16',
    secondary: '#F07819',
    background: '#17130D',
    surface: '#241D14',
    text: '#FFFDF8',
    accent: '#D93620'
  },
  github: {
    repo: 'curiok/el-kaku-carta',
    branch: 'gh-pages',
    publicUrl: 'https://curiok.github.io/el-kaku-carta/'
  }
};

export const initialCategories: Category[] = [
  {
    id: 'cat_promos',
    name: 'Promociones',
    description: 'Combos especiales para compartir al mejor precio',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'cat_hamburguesas',
    name: 'Hamburguesas',
    description: 'Medallones 100% de ternera a la chapa en pan brioche artesanal',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'cat_lomitos',
    name: 'Lomitos',
    description: 'Tiernos bifes de lomo seleccionados en pan casero crocante',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'cat_pizzas',
    name: 'Pizzas',
    description: 'Masa madre madurada 48hs con abundante mozzarella de primera',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'cat_empanadas',
    name: 'Empanadas',
    description: 'Rellenos tradicionales súper jugosos al horno de barro',
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'cat_papas',
    name: 'Papas y Acompañamientos',
    description: 'Papas rústicas cortadas a mano y bastones crocantes',
    sortOrder: 6,
    isActive: true
  },
  {
    id: 'cat_bebidas',
    name: 'Bebidas',
    description: 'Gaseosas de litro y medio, cervezas artesanales y aguas',
    sortOrder: 7,
    isActive: true
  },
  {
    id: 'cat_postres',
    name: 'Postres',
    description: 'Dulzuras artesanales para el final perfecto',
    sortOrder: 8,
    isActive: true
  }
];

export const initialOptionGroups: OptionGroup[] = [
  {
    id: 'opt_coccion',
    name: 'Punto de cocción',
    type: 'single',
    min: 1,
    max: 1,
    isRequired: true,
    isActive: true,
    options: [
      { id: 'coc_1', name: 'A punto (jugoso al centro)', price: 0 },
      { id: 'coc_2', name: 'Cocido tradicional', price: 0 },
      { id: 'coc_3', name: 'Bien cocido', price: 0 }
    ]
  },
  {
    id: 'opt_pan',
    name: 'Tipo de pan',
    type: 'single',
    min: 1,
    max: 1,
    isRequired: true,
    isActive: true,
    options: [
      { id: 'pan_1', name: 'Pan Brioche mantecoso', price: 0 },
      { id: 'pan_2', name: 'Pan de Papa esponjoso', price: 0 },
      { id: 'pan_3', name: 'Pan Sin TACC (Apto Celíacos)', price: 1200 }
    ]
  },
  {
    id: 'opt_extras_burger',
    name: 'Adicionales para tu Hamburguesa',
    type: 'multiple',
    min: 0,
    max: 5,
    isRequired: false,
    isActive: true,
    options: [
      { id: 'ext_1', name: 'Panceta ahumada crocante', price: 1500 },
      { id: 'ext_2', name: 'Doble Cheddar fundido', price: 1200 },
      { id: 'ext_3', name: 'Huevo a la chapa', price: 800 },
      { id: 'ext_4', name: 'Medallón extra de carne 150g', price: 2800 },
      { id: 'ext_5', name: 'Cebolla caramelizada al Malbec', price: 900 }
    ]
  },
  {
    id: 'opt_salsas',
    name: 'Salsas a elección (hasta 3)',
    type: 'multiple',
    min: 0,
    max: 3,
    isRequired: false,
    isActive: true,
    options: [
      { id: 'sal_1', name: 'Mayonesa casera de ajo asado', price: 0 },
      { id: 'sal_2', name: 'Barbacoa ahumada artesanal', price: 0 },
      { id: 'sal_3', name: 'Mostaza antigua con miel', price: 0 },
      { id: 'sal_4', name: 'Salsa Kaku picante suave', price: 0 }
    ]
  }
];

export const initialProducts: Product[] = [
  {
    id: 'prod_mv98ikeq_nc30u',
    name: 'X2 HAMBURGUESAS SIMPLE',
    description: '',
    basePrice: 9000,
    categoryId: 'cat_promos',
    images: [],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: '2026-10-16T03:10:00.000Z',
    updatedAt: '2026-10-16T03:10:00.000Z'
  },
  {
    id: 'prod_mv8mtbpn_1to0t',
    name: 'Hamburguesa simple COMPLETA',
    description: '',
    basePrice: 5000,
    categoryId: 'cat_hamburguesas',
    images: [],
    mainImageIndex: 0,
    sortOrder: 2,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: '2026-10-16T03:10:00.000Z',
    updatedAt: '2026-10-16T03:10:00.000Z'
  },
  {
    id: 'prod_mv8mxfys_yn8uz',
    name: 'Hamburguesa DOBLE COMPLETA',
    description: '',
    basePrice: 6000,
    categoryId: 'cat_hamburguesas',
    images: [],
    mainImageIndex: 0,
    sortOrder: 3,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: '2026-10-16T03:10:00.000Z',
    updatedAt: '2026-10-16T03:10:00.000Z'
  },
  {
    id: 'prod_mv8mufoq_k8a8x',
    name: 'Hamburguesa Doble TODO',
    description: '',
    basePrice: 7000,
    categoryId: 'cat_hamburguesas',
    images: [],
    mainImageIndex: 0,
    sortOrder: 4,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: '2026-10-16T03:10:00.000Z',
    updatedAt: '2026-10-16T03:10:00.000Z'
  },
  {
    id: 'prod_mv8n35i7_ci3qh',
    name: 'LOMITO CON PAPAS',
    description: '',
    basePrice: 10000,
    categoryId: 'cat_lomitos',
    images: [],
    mainImageIndex: 0,
    sortOrder: 5,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: '2026-10-16T03:10:00.000Z',
    updatedAt: '2026-10-16T03:10:00.000Z'
  }
];

