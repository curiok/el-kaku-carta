import type { CartItem, DeliveryType } from '../types';

export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  // Strip all non-digit characters
  return phone.replace(/\D/g, '');
}

export interface BuildWhatsAppMessageParams {
  businessName?: string;
  customerName: string;
  deliveryType: DeliveryType;
  address?: string;
  items: CartItem[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  notes?: string;
  orderId?: string;
}

export function buildWhatsAppOrderMessage(params: BuildWhatsAppMessageParams): string {
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

  const lines: string[] = [
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

export function createWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanPhone = normalizeWhatsAppNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
