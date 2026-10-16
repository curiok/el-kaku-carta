export function formatCurrency(amount, symbol = '$') {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(safeAmount);

  return `${symbol} ${formatted}`;
}

export function generateOrderId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `KAKU-${randomNum}`;
}

export function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppOrderMessage(params) {
  const {
    businessName = 'EL KAKU',
    customerName,
    deliveryType,
    address,
    items = [],
    notes
  } = params;

  const isDelivery = deliveryType === 'delivery';
  const name = (customerName || '').trim();
  const house = (address || '').trim();
  const customerNotes = (notes || '').trim();

  const lines = [
    `*PEDIDO NUEVO — ${businessName.toUpperCase()}*`,
    '',
    `*Nombre:* ${name}`,
    '',
    `*Modalidad:* ${isDelivery ? 'Delivery' : 'Retiro'}`
  ];

  if (isDelivery && house) {
    lines.push('');
    lines.push(`*Casa de:* ${house}`);
  }

  if (customerNotes) {
    lines.push('');
    lines.push(`*Observaciones:* ${customerNotes}`);
  }

  lines.push('');
  lines.push('*PEDIDO:*');
  lines.push('');

  const formattedItems = items.map((item, index) => {
    const num = index + 1;
    const itemTitle = `${num}. ${item.quantity} x ${item.productName}`;
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      const optionsLines = item.selectedOptions.map(opt => `   - ${opt.groupName}: ${opt.optionName}`);
      return `${itemTitle}\n${optionsLines.join('\n')}`;
    }
    return itemTitle;
  }).join('\n');

  lines.push(formattedItems);

  return lines.join('\n');
}

export function createWhatsAppLink(phoneNumber, message) {
  const cleanPhone = normalizeWhatsAppNumber(phoneNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function buildPublicMenuJson(business, categories, products, optionGroups) {
  const activeCategories = categories.filter(c => c.isActive);
  const activeCategoryIds = new Set(activeCategories.map(c => c.id));
  const activeProducts = products.filter(p => p.isAvailable && activeCategoryIds.has(p.categoryId));
  const activeOptionGroupIds = new Set(activeProducts.flatMap(p => p.optionGroupIds || []));
  const relevantOptionGroups = optionGroups.filter(og => og.isActive && activeOptionGroupIds.has(og.id));

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    business: {
      name: business?.businessName || 'El Kaku',
      menuTitle: business?.menuTitle || 'Carta Digital El Kaku',
      whatsappNumber: business?.whatsappNumber || '+54 9 3821 40-6662',
      currencySymbol: business?.currencySymbol || '$',
      deliveryEnabled: business?.deliveryEnabled ?? true,
      pickupEnabled: business?.pickupEnabled ?? true,
      deliveryFeeMode: business?.deliveryFeeMode || 'free',
      deliveryFee: business?.deliveryFeeMode === 'paid' ? (Number(business?.deliveryFee) || 0) : 0,
      welcomeText: business?.welcomeText || '',
      contactText: business?.contactText || '',
      theme: business?.theme || {
        primary: '#C99A16',
        secondary: '#F07819',
        background: '#17130D',
        surface: '#241D14',
        text: '#FFFDF8',
        accent: '#D93620'
      }
    },
    categories: activeCategories,
    products: activeProducts,
    optionGroups: relevantOptionGroups
  };
}

export function getZeroTokenGitHubEditUrl(repo = 'curiok/el-kaku-carta', branch = 'gh-pages') {
  return `https://github.com/${repo}/edit/${branch}/data/menu.json`;
}

export function generateSalt(lengthBytes = 16) {
  const salt = new Uint8Array(lengthBytes);
  globalThis.crypto.getRandomValues(salt);
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const cleanHex = saltHex.trim();
  const saltBytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    saltBytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  const derived = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(attempt, saltHex, storedHashHex) {
  const computed = await hashPassword(attempt, saltHex);
  return computed === storedHashHex;
}

