export function formatCurrency(amount: number, symbol = '$'): string {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(safeAmount);

  return `${symbol} ${formatted}`;
}

export function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `KAKU-${randomNum}`;
}
