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

function createPlaceholderSvg(title: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="${color}"/>
    <circle cx="300" cy="180" r="70" fill="rgba(255,255,255,0.15)"/>
    <path d="M260 185 C260 160, 340 160, 340 185 Z" fill="#ffffff" opacity="0.9"/>
    <rect x="250" y="195" width="100" height="14" rx="4" fill="#fbbf24"/>
    <path d="M255 215 C255 230, 345 230, 345 215 Z" fill="#ffffff" opacity="0.9"/>
    <text x="300" y="310" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="300" y="345" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">El Kaku — Gastronomía</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const initialProducts: Product[] = [
  {
    id: 'prod_promo_1',
    name: 'Combo Kaku: 2 Doble Cheddar + Papas Grandes',
    description: 'Dos hamburguesas con doble carne y doble cheddar acompañadas de una porción gigante de papas rústicas.',
    basePrice: 31000,
    categoryId: 'cat_promos',
    images: [createPlaceholderSvg('Combo 2 Burgers + Papas', '#b45309')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_burger_1',
    name: 'Hamburguesa Doble Cheddar Bacon',
    description: 'Dos medallones de ternera de 120g, cuatro fetas de cheddar cremoso fundido y abundante panceta crocante.',
    basePrice: 14500,
    categoryId: 'cat_hamburguesas',
    images: [createPlaceholderSvg('Doble Cheddar Bacon', '#dc2626')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_burger_2',
    name: 'Hamburguesa Kaku Especial',
    description: 'Doble carne, queso provoleta crocante a la plancha, cebolla caramelizada, rúcula fresca y mayonesa ahumada.',
    basePrice: 15800,
    categoryId: 'cat_hamburguesas',
    images: [createPlaceholderSvg('Hamburguesa Kaku Especial', '#ea580c')],
    mainImageIndex: 0,
    sortOrder: 2,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_lomito_1',
    name: 'Lomito Completo Cordobés',
    description: 'Tierno bife de lomo a la plancha, jamón cocido, queso, lechuga capuchina, tomate redondo, huevo frito y mayonesa casera en pan baguette artesanal.',
    basePrice: 17200,
    categoryId: 'cat_lomitos',
    images: [createPlaceholderSvg('Lomito Completo Cordobés', '#7c2d12')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pizza_1',
    name: 'Pizza Napolitana Especial con Jamón',
    description: 'Masa madre madurada 48hs al horno, salsa de tomates italianos, abundante mozzarella, jamón cocido, rodajas de tomate y provenzal.',
    basePrice: 15400,
    categoryId: 'cat_pizzas',
    images: [createPlaceholderSvg('Pizza Napolitana Especial', '#c2410c')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_empanadas_1',
    name: 'Docena de Empanadas Criollas de Carne Cortada a Cuchillo',
    description: '12 empanadas de masa casera bien hojaldrada, carne tierna, cebollita de verdeo, pimentón dulce y comino norteño.',
    basePrice: 14500,
    categoryId: 'cat_empanadas',
    images: [createPlaceholderSvg('Empanadas Criollas x12', '#d97706')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_papas_1',
    name: 'Papas Rústicas Cheddar y Verdeo',
    description: 'Porción abundante de papas rústicas con piel, crocantes por fuera y tiernas por dentro, bañadas en queso cheddar y verdeo fresco.',
    basePrice: 8900,
    categoryId: 'cat_papas',
    images: [createPlaceholderSvg('Papas Rústicas con Cheddar', '#eab308')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_bebida_1',
    name: 'Cerveza Patagonia Amber Lager 730ml',
    description: 'Cerveza de sabor balanceado, con sutiles notas a caramelo y tostado. Servida helada.',
    basePrice: 5800,
    categoryId: 'cat_bebidas',
    images: [createPlaceholderSvg('Patagonia Amber Lager', '#0f766e')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_postre_1',
    name: 'Volcán Tibio de Chocolate con Helado',
    description: 'Bizcochuelo tibio relleno de chocolate belga fundido, acompañado con una bocha de helado de crema americana artesanal.',
    basePrice: 6500,
    categoryId: 'cat_postres',
    images: [createPlaceholderSvg('Volcán de Chocolate', '#4c1d95')],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
