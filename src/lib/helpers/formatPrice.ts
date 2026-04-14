export function formatPrice(value: string): string {
  const num = +value / 100;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: num < 1 ? 1 : 0,
    maximumFractionDigits: num < 1 ? 2 : 0,
  }).format(num);
}
