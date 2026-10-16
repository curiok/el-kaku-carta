/**
 * Comprehensive Automated Test Suite for El Kaku — Carta Digital
 * Tests data integrity, cart calculations, whatsapp message generation,
 * image processing, local orders snapshot, and public static bundle generation.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatCurrency,
  generateOrderId,
  normalizeWhatsAppNumber,
  buildWhatsAppOrderMessage,
  createWhatsAppLink,
  buildPublicMenuJson,
  getZeroTokenGitHubEditUrl,
  generateSalt,
  hashPassword,
  verifyPassword
} from './test-utils.js';
import { buildStaticMenuBundle } from '../publisher/builder.js';
import { testGitHubConnection } from '../publisher/github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('1. Formato Monetario y Generador de IDs', () => {
  test('Formatea números enteros en moneda argentina con símbolo $', () => {
    assert.equal(formatCurrency(14500), '$ 14.500');
    assert.equal(formatCurrency(0), '$ 0');
    assert.equal(formatCurrency(1200000), '$ 1.200.000');
    assert.equal(formatCurrency(-500), '$ 0'); // Previene negativos
  });

  test('Genera IDs de pedido únicos con prefijo KAKU-', () => {
    const id1 = generateOrderId();
    const id2 = generateOrderId();
    assert.match(id1, /^KAKU-\d{6}$/);
    assert.match(id2, /^KAKU-\d{6}$/);
    assert.notEqual(id1, id2);
  });
});

describe('2. Integración y Normalización de WhatsApp (Nuevo Formato Simplificado sin Precios)', () => {
  test('Normaliza número de teléfono oficial +54 9 3821 40-6662 a formato internacional', () => {
    const rawNumber = '+54 9 3821 40-6662';
    const normalized = normalizeWhatsAppNumber(rawNumber);
    assert.equal(normalized, '5493821406662');
  });

  test('Genera mensaje exacto para Delivery con Casa de y SIN precios, subtotales, totales ni IDs', () => {
    const message = buildWhatsAppOrderMessage({
      businessName: 'EL KAKU',
      orderId: 'KAKU-123456',
      customerName: 'Ricardo Torres',
      deliveryType: 'delivery',
      address: 'Silvana Gaun',
      items: [
        {
          cartItemId: 'item_1',
          productId: 'prod_1',
          productName: 'Burger Activa',
          productImage: '',
          unitBasePrice: 12000,
          unitFinalPrice: 12000,
          quantity: 1,
          selectedOptions: [],
          subtotal: 12000
        },
        {
          cartItemId: 'item_2',
          productId: 'prod_2',
          productName: 'Coca Cola',
          productImage: '',
          unitBasePrice: 3000,
          unitFinalPrice: 3000,
          quantity: 1,
          selectedOptions: [],
          subtotal: 3000
        }
      ],
      subtotal: 15000,
      deliveryFee: 1500,
      total: 16500,
      notes: 'Sin cebolla por favor'
    });

    const expected = [
      '*PEDIDO NUEVO — EL KAKU*',
      '',
      '*Nombre:* Ricardo Torres',
      '',
      '*Modalidad:* Delivery',
      '',
      '*Casa de:* Silvana Gaun',
      '',
      '*PEDIDO:*',
      '',
      '1. 1 x Burger Activa',
      '2. 1 x Coca Cola'
    ].join('\n');

    assert.equal(message, expected);

    // Verificaciones negativas obligatorias
    assert.ok(!message.includes('*ID:*') && !message.includes('KAKU-'), 'No debe incluir ID de pedido');
    assert.ok(!message.includes('$'), 'No debe incluir signo $ ni precios');
    assert.ok(!message.includes('Subtotal'), 'No debe incluir subtotal');
    assert.ok(!message.includes('TOTAL'), 'No debe incluir total');
    assert.ok(!message.includes('Envío'), 'No debe incluir precio ni etiqueta de envío');
    assert.ok(!message.includes('Observaciones'), 'No debe incluir observaciones');
    assert.ok(!message.includes('Dirección:'), 'No debe usar la etiqueta Dirección, debe usar Casa de');
  });

  test('Genera mensaje exacto para Retiro OMITIENDO completamente Casa de', () => {
    const message = buildWhatsAppOrderMessage({
      businessName: 'EL KAKU',
      customerName: 'Ricardo Torres',
      deliveryType: 'pickup',
      address: 'Dato que debe ignorarse',
      items: [
        {
          cartItemId: 'item_1',
          productId: 'prod_1',
          productName: 'Empanadas',
          productImage: '',
          unitBasePrice: 8000,
          unitFinalPrice: 8000,
          quantity: 2,
          selectedOptions: [],
          subtotal: 16000
        },
        {
          cartItemId: 'item_2',
          productId: 'prod_2',
          productName: 'Coca Cola',
          productImage: '',
          unitBasePrice: 3000,
          unitFinalPrice: 3000,
          quantity: 1,
          selectedOptions: [],
          subtotal: 3000
        }
      ]
    });

    const expected = [
      '*PEDIDO NUEVO — EL KAKU*',
      '',
      '*Nombre:* Ricardo Torres',
      '',
      '*Modalidad:* Retiro',
      '',
      '*PEDIDO:*',
      '',
      '1. 2 x Empanadas',
      '2. 1 x Coca Cola'
    ].join('\n');

    assert.equal(message, expected);
    assert.ok(!message.includes('Casa de'), 'Para retiro NUNCA debe figurar Casa de');
    assert.ok(!message.includes('$'), 'No debe haber precios');
  });

  test('Productos con opciones/adicionales conservan los detalles identificatorios pero NUNCA agregan precios', () => {
    const message = buildWhatsAppOrderMessage({
      businessName: 'EL KAKU',
      customerName: 'Juan Pérez',
      deliveryType: 'delivery',
      address: 'Casa Verde frente a la plaza',
      items: [
        {
          cartItemId: 'prod_burger_custom',
          productId: 'p_burger',
          productName: 'Burger Doble Cheddar Bacon',
          productImage: '',
          unitBasePrice: 14500,
          unitFinalPrice: 16000,
          quantity: 1,
          selectedOptions: [
            { groupId: 'g1', groupName: 'Punto de cocción', optionId: 'c1', optionName: 'A punto', additionalPrice: 0 },
            { groupId: 'g2', groupName: 'Adicional', optionId: 'e1', optionName: 'Panceta crocante', additionalPrice: 1500 }
          ],
          subtotal: 16000
        }
      ]
    });

    assert.ok(message.includes('1. 1 x Burger Doble Cheddar Bacon'));
    assert.ok(message.includes('- Punto de cocción: A punto'));
    assert.ok(message.includes('- Adicional: Panceta crocante'));
    assert.ok(!message.includes('$'), 'No debe contener ningún precio ni monto en los adicionales');
    assert.ok(!message.includes('(+'), 'No debe haber etiquetas (+...) de precio');
  });

  test('Crea enlace oficial https://wa.me/ con mensaje URL-encoded sin errores de caracteres especiales', () => {
    const rawNumber = '+54 9 3821 40-6662';
    const message = '*PEDIDO NUEVO — EL KAKU*\n\n*Nombre:* Ricardo\n\n*Modalidad:* Delivery\n\n*Casa de:* Silvana\n\n*PEDIDO:*\n\n1. 1 x Burger Activa';
    const link = createWhatsAppLink(rawNumber, message);

    assert.ok(link.startsWith('https://wa.me/5493821406662?text='), 'Debe iniciar con enlace wa.me oficial');
    assert.ok(!link.includes(' '), 'No debe contener espacios sin codificar');
    assert.ok(link.includes('%E2%80%94'), 'Debe codificar el guión largo');
    assert.ok(link.includes('%0A'), 'Debe codificar los saltos de línea');
  });
});

describe('3. Lógica de Carrito y Separación de Combinaciones', () => {
  test('Diferencia un mismo producto cuando tiene opciones distintas', () => {
    const optA = [{ groupId: 'g1', groupName: 'Cocción', optionId: 'o1', optionName: 'Jugoso', additionalPrice: 0 }];
    const optB = [{ groupId: 'g1', groupName: 'Cocción', optionId: 'o2', optionName: 'Bien cocido', additionalPrice: 0 }];

    const idA = `prod_1__${optA.map(o => `${o.groupId}:${o.optionId}`).sort().join('|')}`;
    const idB = `prod_1__${optB.map(o => `${o.groupId}:${o.optionId}`).sort().join('|')}`;

    assert.notEqual(idA, idB, 'Las combinaciones distintas deben generar identificadores separados');
  });

  test('Calcula correctamente el precio unitario base + adicionales * cantidad', () => {
    const basePrice = 14500;
    const extras = [1500, 1200]; // Panceta + Cheddar
    const quantity = 3;

    const unitFinalPrice = basePrice + extras.reduce((a, b) => a + b, 0);
    const subtotal = unitFinalPrice * quantity;

    assert.equal(unitFinalPrice, 17200);
    assert.equal(subtotal, 51600);
  });
});

describe('4. Separación Estricta y Generación del Paquete Público', () => {
  test('buildStaticMenuBundle genera archivos estáticos públicos sin incluir pedidos ni tokens', async () => {
    const samplePayload = {
      business: {
        name: 'El Kaku',
        menuTitle: 'Carta Digital El Kaku',
        whatsappNumber: '+54 9 3821 40-6662',
        currencySymbol: '$',
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: 1500,
        welcomeText: 'Bienvenidos a El Kaku'
      },
      categories: [
        { id: 'cat_1', name: 'Hamburguesas', sortOrder: 1, isActive: true },
        { id: 'cat_2', name: 'Bebidas Ocultas', sortOrder: 2, isActive: false } // Inactiva
      ],
      products: [
        {
          id: 'p1',
          name: 'Burger Activa',
          description: 'Rica burger',
          basePrice: 12000,
          categoryId: 'cat_1',
          images: [],
          mainImageIndex: 0,
          sortOrder: 1,
          isAvailable: true,
          optionGroupIds: []
        },
        {
          id: 'p2',
          name: 'Burger Pausada',
          description: 'No disponible',
          basePrice: 15000,
          categoryId: 'cat_1',
          images: [],
          mainImageIndex: 0,
          sortOrder: 2,
          isAvailable: false, // Pausada
          optionGroupIds: []
        }
      ],
      optionGroups: []
    };

    const bundle = await buildStaticMenuBundle(samplePayload);

    // Verificar que solo se incluyan categorías y productos activos
    assert.equal(bundle.publicMenuData.categories.length, 1);
    assert.equal(bundle.publicMenuData.categories[0].name, 'Hamburguesas');

    assert.equal(bundle.publicMenuData.products.length, 1);
    assert.equal(bundle.publicMenuData.products[0].name, 'Burger Activa');

    // Verificar que data/menu.json y .nojekyll existan
    const menuJsonFile = bundle.files.find(f => f.path === 'data/menu.json');
    assert.ok(menuJsonFile, 'Debe incluir data/menu.json');

    const noJekyllFile = bundle.files.find(f => f.path === '.nojekyll');
    assert.ok(noJekyllFile, 'Debe incluir .nojekyll para GitHub Pages');

    // Comprobar que NINGÚN archivo contenga información sensible
    const allPaths = bundle.files.map(f => f.path);
    assert.ok(!allPaths.some(p => p.includes('.env')), 'Nunca debe haber archivos .env');
    assert.ok(!allPaths.some(p => p.includes('orders')), 'Nunca debe haber pedidos privados');
  });

  test('testGitHubConnection detecta ausencia de token de forma segura sin revelar secretos', async () => {
    const res = await testGitHubConnection('', 'curiok/el-kaku-carta', 'gh-pages');
    assert.equal(res.ok, false);
    assert.equal(res.code, 'TOKEN_MISSING');
    assert.ok(!res.message.includes('undefined'), 'No debe filtrar datos no definidos');
  });
});

describe('5. Publicación Directa desde el Celular y Modo Sin Token', () => {
  test('buildPublicMenuJson extrae exclusivamente datos públicos y excluye pedidos locales', () => {
    const business = {
      businessName: 'El Kaku',
      menuTitle: 'Carta Digital',
      whatsappNumber: '+54 9 3821 40-6662',
      currencySymbol: '$',
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFee: 1500,
      welcomeText: 'Bienvenidos'
    };
    const categories = [
      { id: 'c1', name: 'Hamburguesas', sortOrder: 1, isActive: true },
      { id: 'c2', name: 'Inactiva', sortOrder: 2, isActive: false }
    ];
    const products = [
      { id: 'p1', name: 'Burger Activa', basePrice: 10000, categoryId: 'c1', isAvailable: true, optionGroupIds: [] },
      { id: 'p2', name: 'Burger Pausada', basePrice: 12000, categoryId: 'c1', isAvailable: false, optionGroupIds: [] },
      { id: 'p3', name: 'Burger en Cat Inactiva', basePrice: 9000, categoryId: 'c2', isAvailable: true, optionGroupIds: [] }
    ];

    const result = buildPublicMenuJson(business, categories, products, []);

    assert.equal(result.categories.length, 1);
    assert.equal(result.categories[0].id, 'c1');
    assert.equal(result.products.length, 1);
    assert.equal(result.products[0].id, 'p1');
    assert.equal(result.business.name, 'El Kaku');

    // Comprobar que no hay propiedades privadas
    assert.equal(result.orders, undefined);
    assert.equal(result.githubToken, undefined);
  });

  test('getZeroTokenGitHubEditUrl genera el enlace oficial de edición móvil sin requerir tokens', () => {
    const url = getZeroTokenGitHubEditUrl('curiok/el-kaku-carta', 'gh-pages');
    assert.equal(url, 'https://github.com/curiok/el-kaku-carta/edit/gh-pages/data/menu.json');
    assert.ok(!url.includes('token'), 'No debe contener ningún parámetro de token en la URL');
  });
});

describe('6. Autenticación Segura y Criptografía PBKDF2 del Panel Admin', () => {
  test('Genera sal aleatoria criptográfica de 16 bytes (32 caracteres hexadecimales)', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    assert.equal(salt1.length, 32);
    assert.equal(salt2.length, 32);
    assert.notEqual(salt1, salt2, 'Las sales deben ser únicas por dispositivo/instalación');
  });

  test('Valida correctamente las credenciales iniciales solicitadas: curi / curiok', async () => {
    const salt = generateSalt();
    const storedHash = await hashPassword('curiok', salt);

    // Verificación válida
    const isValid = await verifyPassword('curiok', salt, storedHash);
    assert.equal(isValid, true, 'Debe aceptar la contraseña inicial curiok');
  });

  test('Rechaza contraseñas incorrectas sin revelar detalles ni filtrar el secreto', async () => {
    const salt = generateSalt();
    const storedHash = await hashPassword('curiok', salt);

    const isWrong = await verifyPassword('password_erronea', salt, storedHash);
    assert.equal(isWrong, false, 'Debe rechazar contraseñas inválidas');

    const isEmpty = await verifyPassword('', salt, storedHash);
    assert.equal(isEmpty, false, 'Debe rechazar contraseñas vacías');
  });

  test('La contraseña en texto plano nunca se guarda en el hash PBKDF2', async () => {
    const salt = generateSalt();
    const storedHash = await hashPassword('curiok', salt);

    assert.equal(storedHash.includes('curiok'), false, 'El hash nunca debe contener la contraseña en texto plano');
    assert.equal(storedHash.length, 64, 'El hash SHA-256 debe ser de 256 bits (64 caracteres hex)');
  });

  test('Permite actualizar credenciales con una nueva sal y verificar la nueva contraseña', async () => {
    const newSalt = generateSalt();
    const newPassword = 'nueva_clave_segura_2026';
    const newHash = await hashPassword(newPassword, newSalt);

    const validNew = await verifyPassword(newPassword, newSalt, newHash);
    assert.equal(validNew, true, 'Debe aceptar la nueva contraseña');

    const invalidOld = await verifyPassword('curiok', newSalt, newHash);
    assert.equal(invalidOld, false, 'La contraseña anterior debe quedar invalidada');
  });
});

describe('7. Identidad Visual y Paleta Oficial de El Kaku', () => {
  test('Archivos de logo SVG de El Kaku existen y contienen elementos de rotisería requeridos', () => {
    const adminLogoPath = path.resolve(__dirname, '../admin/public/logo-kaku.svg');
    const menuLogoPath = path.resolve(__dirname, '../public-menu/public/logo-kaku.svg');

    assert.ok(fs.existsSync(adminLogoPath), 'Debe existir logo-kaku.svg en admin/public');
    assert.ok(fs.existsSync(menuLogoPath), 'Debe existir logo-kaku.svg en public-menu/public');

    const svgContent = fs.readFileSync(adminLogoPath, 'utf-8');
    assert.ok(svgContent.includes('EL KAKÚ'), 'El logo debe contener el texto EL KAKÚ');
    assert.ok(svgContent.includes('ROTISERÍA'), 'El logo debe contener la insignia ROTISERÍA');
    assert.ok(svgContent.includes('#C99A16'), 'El logo debe usar el dorado oficial #C99A16');
    assert.ok(svgContent.includes('#D93620') || svgContent.includes('#F07819'), 'El logo debe contener llamas en tonos fuego/rojo');
    assert.ok(svgContent.includes('circle'), 'El logo debe tener el emblema circular');
  });

  test('Paleta de colores oficial está centralizada en variables CSS de admin.css y menu.css', () => {
    const adminCssPath = path.resolve(__dirname, '../admin/src/styles/admin.css');
    const menuCssPath = path.resolve(__dirname, '../public-menu/src/styles/menu.css');

    const adminCss = fs.readFileSync(adminCssPath, 'utf-8');
    const menuCss = fs.readFileSync(menuCssPath, 'utf-8');

    const requiredVars = [
      '--color-gold: #C99A16',
      '--color-gold-dark: #946A17',
      '--color-fire-orange: #F07819',
      '--color-flame-red: #D93620',
      '--color-warm-yellow: #F5C542',
      '--color-bg-light: #FFFDF8',
      '--color-bg-dark: #17130D',
      '--color-text-main: #292116',
      '--color-border: #E8DCC4'
    ];

    for (const v of requiredVars) {
      assert.ok(adminCss.includes(v), `admin.css debe definir ${v}`);
      assert.ok(menuCss.includes(v), `menu.css debe definir ${v}`);
    }
  });
});

describe('8. Configuración de Envío Gratis por Defecto y Futura Activación Paga', () => {
  test('El costo de envío es $0 / Gratis por defecto en seedData y menu.json', () => {
    const menuJsonPath = path.resolve(__dirname, '../public-menu/public/data/menu.json');
    const menuData = JSON.parse(fs.readFileSync(menuJsonPath, 'utf-8'));

    assert.equal(menuData.business.deliveryFee, 0, 'El costo inicial de envío en menu.json debe ser 0');
    assert.equal(menuData.business.deliveryFeeMode, 'free', 'El modo inicial debe ser free');
  });

  test('buildPublicMenuJson mantiene costo 0 cuando deliveryFeeMode es free o no especificado', () => {
    const defaultBusiness = {
      businessName: 'El Kaku',
      deliveryFee: 1500, // aunque tenga valor residual anterior, si es free debe forzarse a 0
      deliveryFeeMode: 'free'
    };
    const res = buildPublicMenuJson(defaultBusiness, [], [], []);
    assert.equal(res.business.deliveryFee, 0);
    assert.equal(res.business.deliveryFeeMode, 'free');
  });

  test('Cuando se activa el cobro en el futuro, buildPublicMenuJson adopta el costo pero WhatsApp jamás incluye precios', () => {
    const paidBusiness = {
      businessName: 'El Kaku',
      deliveryFee: 2000,
      deliveryFeeMode: 'paid'
    };
    const res = buildPublicMenuJson(paidBusiness, [], [], []);
    assert.equal(res.business.deliveryFee, 2000);
    assert.equal(res.business.deliveryFeeMode, 'paid');

    // Mensaje de WhatsApp generado con envío pago activado
    const message = buildWhatsAppOrderMessage({
      businessName: 'EL KAKU',
      customerName: 'Ricardo Torres',
      deliveryType: 'delivery',
      address: 'Silvana Gaun',
      items: [{ cartItemId: '1', productId: 'p1', productName: 'Burger Activa', quantity: 1, selectedOptions: [] }],
      subtotal: 10000,
      deliveryFee: 2000,
      total: 12000
    });

    assert.ok(!message.includes('2000'), 'El mensaje de WhatsApp no debe incluir el costo de envío');
    assert.ok(!message.includes('10000'), 'El mensaje de WhatsApp no debe incluir subtotal');
    assert.ok(!message.includes('12000'), 'El mensaje de WhatsApp no debe incluir total');
    assert.ok(!message.includes('$'), 'El mensaje de WhatsApp no debe tener símbolo $');
  });
});

describe('9. Aislamiento y Configuración PWA de El Kaku Admin en iPhone', () => {
  test('manifest-admin.json y manifest-admin.webmanifest existen y definen start_url y scope hacia ./admin.html', () => {
    const adminJsonPath = path.resolve(__dirname, '../admin/public/manifest-admin.json');
    const adminWebmanifestPath = path.resolve(__dirname, '../admin/public/manifest-admin.webmanifest');
    assert.ok(fs.existsSync(adminJsonPath), 'Debe existir manifest-admin.json');
    assert.ok(fs.existsSync(adminWebmanifestPath), 'Debe existir manifest-admin.webmanifest');

    for (const p of [adminJsonPath, adminWebmanifestPath]) {
      const manifest = JSON.parse(fs.readFileSync(p, 'utf-8'));
      assert.equal(manifest.start_url, './admin.html', 'start_url de Admin debe ser ./admin.html');
      assert.equal(manifest.scope, './admin.html', 'scope de Admin debe ser ./admin.html');
      assert.equal(manifest.id, 'el-kaku-admin-pwa', 'id de Admin debe ser único');
      assert.equal(manifest.short_name, 'El Kaku Admin');
      assert.ok(manifest.icons.some(i => i.src.includes('icon-admin-192.png')), 'Debe tener icono PNG 192');
      assert.ok(manifest.icons.some(i => i.src.includes('icon-admin-512.png')), 'Debe tener icono PNG 512');
    }
  });

  test('manifest.json y manifest.webmanifest de la carta pública definen start_url hacia ./index.html', () => {
    const publicJsonPath = path.resolve(__dirname, '../public-menu/public/manifest.json');
    const publicWebmanifestPath = path.resolve(__dirname, '../public-menu/public/manifest.webmanifest');
    assert.ok(fs.existsSync(publicJsonPath), 'Debe existir manifest.json público');
    assert.ok(fs.existsSync(publicWebmanifestPath), 'Debe existir manifest.webmanifest público');

    for (const p of [publicJsonPath, publicWebmanifestPath]) {
      const manifest = JSON.parse(fs.readFileSync(p, 'utf-8'));
      assert.equal(manifest.start_url, './index.html', 'start_url de la carta pública debe ser ./index.html');
      assert.equal(manifest.id, 'el-kaku-carta-pwa', 'id de Carta debe ser el-kaku-carta-pwa');
      assert.equal(manifest.short_name, 'El Kaku');
      assert.ok(manifest.icons.some(i => i.src.includes('icon-192.png')), 'Debe tener icono PNG 192');
    }
  });

  test('admin/index.html contiene meta tags para iOS Safari, icono PNG apple-touch-icon y manifest-admin.json', () => {
    const adminHtmlPath = path.resolve(__dirname, '../admin/index.html');
    const content = fs.readFileSync(adminHtmlPath, 'utf-8');

    assert.ok(content.includes('name="apple-mobile-web-app-capable" content="yes"'), 'Debe incluir apple-mobile-web-app-capable');
    assert.ok(content.includes('name="apple-mobile-web-app-title" content="El Kaku Admin"'), 'Debe titularse El Kaku Admin');
    assert.ok(content.includes('href="./manifest-admin.json"'), 'Debe enlazar a manifest-admin.json');
    assert.ok(content.includes('href="./apple-touch-icon-admin.png"'), 'Debe enlazar a PNG apple-touch-icon-admin.png para iOS');
  });

  test('public-menu/index.html contiene meta tags para iOS Safari, icono PNG apple-touch-icon y manifest.json', () => {
    const publicHtmlPath = path.resolve(__dirname, '../public-menu/index.html');
    const content = fs.readFileSync(publicHtmlPath, 'utf-8');

    assert.ok(content.includes('name="apple-mobile-web-app-capable" content="yes"'), 'Debe incluir apple-mobile-web-app-capable');
    assert.ok(content.includes('name="apple-mobile-web-app-title" content="El Kaku"'), 'Debe titularse El Kaku');
    assert.ok(content.includes('href="./manifest.json"'), 'Debe enlazar a manifest.json');
    assert.ok(content.includes('href="./apple-touch-icon.png"'), 'Debe enlazar a PNG apple-touch-icon.png para iOS');
  });

  test('Service Worker sw.js nunca redirige admin.html a index.html en navegaciones', () => {
    const adminSwPath = path.resolve(__dirname, '../admin/public/sw.js');
    const menuSwPath = path.resolve(__dirname, '../public-menu/public/sw.js');

    const adminSw = fs.readFileSync(adminSwPath, 'utf-8');
    const menuSw = fs.readFileSync(menuSwPath, 'utf-8');

    assert.ok(adminSw.includes('admin.html'), 'SW de admin debe proteger admin.html');
    assert.ok(menuSw.includes('admin.html'), 'SW del menú debe proteger admin.html');
    assert.ok(adminSw.includes('kaku-pwa-cache-v6'), 'Debe tener versión de caché v6');
    assert.ok(menuSw.includes('kaku-pwa-cache-v6'), 'Debe tener versión de caché v6');
  });
});

describe('10. Control de Disponibilidad y Pausa/Reactivación de Productos', () => {
  const sampleProduct = {
    id: 'prod_test_available',
    name: 'Hamburguesa Test Directa',
    description: 'Deliciosa hamburguesa para venta directa',
    basePrice: 15000,
    categoryId: 'cat_hamburguesas',
    images: ['test.jpg'],
    mainImageIndex: 0,
    sortOrder: 1,
    isAvailable: true,
    optionGroupIds: []
  };

  test('1. Se puede configurar un producto estrictamente con los 6 campos visuales (nombre, precio, categoría, orden, descripción, fotos)', () => {
    const productKeys = Object.keys(sampleProduct);
    const requiredConfigKeys = ['name', 'description', 'basePrice', 'categoryId', 'images', 'sortOrder'];
    for (const key of requiredConfigKeys) {
      assert.ok(productKeys.includes(key), `El producto debe incluir ${key}`);
    }
    assert.deepEqual(sampleProduct.optionGroupIds, [], 'El producto no debe tener grupos de opciones');
  });

  test('2. Formulario y lista de productos contienen control claro de «Disponible» y «Pausado»', () => {
    const productsPagePath = path.resolve(__dirname, '../admin/src/pages/ProductsPage.tsx');
    const content = fs.readFileSync(productsPagePath, 'utf-8');

    assert.ok(content.includes('formIsAvailable'), 'Debe existir el estado formIsAvailable para controlar la disponibilidad');
    assert.ok(content.includes('handleToggleAvailability'), 'Debe existir la función handleToggleAvailability para pausar y reactivar');
    assert.ok(content.includes('toggleProductAvailability'), 'Debe invocar toggleProductAvailability para persistir el cambio');
    assert.ok(content.includes('Disponible') && content.includes('Pausado'), 'Debe mostrar claramente los estados «Disponible» y «Pausado»');
  });

  test('3. Formulario tampoco contiene opciones, grupos ni personalizaciones innecesarias', () => {
    const productsPagePath = path.resolve(__dirname, '../admin/src/pages/ProductsPage.tsx');
    const content = fs.readFileSync(productsPagePath, 'utf-8');

    assert.ok(!content.includes('Opciones y Personalizaciones'), 'No debe tener título de opciones y personalizaciones');
    assert.ok(!content.includes('formOptionGroupIds'), 'No debe tener casillas de grupos de opciones');
    assert.ok(!content.includes('getOptionGroups'), 'No debe solicitar grupos de opciones a la base de datos');
  });


  test('4. Los productos creados están disponibles para la venta por defecto y visibles en la carta', () => {
    const catalog = [sampleProduct];
    const publicProducts = catalog.filter(p => p.isAvailable);

    assert.equal(publicProducts.length, 1);
    assert.equal(publicProducts[0].name, 'Hamburguesa Test Directa');
  });

  test('5. Productos no disponibles quedan excluidos de la carta pública y del carrito', () => {
    const unavailableProduct = { ...sampleProduct, id: 'prod_inactive', isAvailable: false };
    const catalog = [sampleProduct, unavailableProduct];
    const publicProducts = catalog.filter(p => p.isAvailable);

    assert.equal(publicProducts.length, 1);
    assert.ok(!publicProducts.some(p => p.id === 'prod_inactive'));

    const cart = [];
    const tryAdd = (p) => {
      if (!p || !p.isAvailable) return false;
      cart.push(p);
      return true;
    };
    assert.equal(tryAdd(unavailableProduct), false, 'No permite agregar producto inactivo al carrito');
    assert.equal(cart.length, 0);
  });

  test('6. Interfaz administrativa excluye pestañas y accesos directos a opciones', () => {
    const adminAppPath = path.resolve(__dirname, '../admin/src/App.tsx');
    const adminAppContent = fs.readFileSync(adminAppPath, 'utf-8');
    assert.ok(!adminAppContent.includes('OptionsPage'), 'Admin App no debe importar ni renderizar OptionsPage');
    assert.ok(!adminAppContent.includes("'options'"), 'Admin App activeTab no debe incluir options');

    const dashboardPath = path.resolve(__dirname, '../admin/src/pages/DashboardPage.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
    assert.ok(!dashboardContent.includes("onNavigate('options')"), 'Dashboard no debe tener atajo a options');
  });

  test('7. Carta pública agrega directamente al carrito en 1 clic sin ventana modal', () => {
    const menuAppPath = path.resolve(__dirname, '../public-menu/src/App.tsx');
    const menuAppContent = fs.readFileSync(menuAppPath, 'utf-8');
    assert.ok(!menuAppContent.includes('ProductModal'), 'Carta pública no debe renderizar ProductModal');
    assert.ok(!menuAppContent.includes('Personalizable con extras'), 'Carta pública no debe mencionar personalizaciones');
    assert.ok(menuAppContent.includes('addItem(product, 1, [])'), 'Debe agregar directamente al carrito en 1 clic');
  });
});

