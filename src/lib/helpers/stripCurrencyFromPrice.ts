export function stripCurrencyFromPrice(price: string): string {
  if (isNaN(parseFloat(price))) return price;
  return price.replace(/\s*р\.$/, '');
}
