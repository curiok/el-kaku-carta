/**
 * Currency and string formatting utilities for El Kaku
 */

export function formatCurrency(amount: number, symbol = '$'): string {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  // Format with Argentine thousands separator (dots for thousands)
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(safeAmount);

  return `${symbol} ${formatted}`;
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return isoString;
  }
}

export function generateId(prefix = 'kaku'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

export function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `KAKU-${randomNum}`;
}
