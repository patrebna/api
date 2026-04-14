export function extractCharacteristics(adParams: Record<string, any>, exclude: string[] = []) {
  return Object.entries(adParams)
    .filter(([key, item]) => !exclude.includes(key) && (item.vl ?? item.v) && (item.vl ?? item.v) !== '-')
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([, item]) => ({
      label: item.pl,
      value: item.vl ?? item.v,
    }));
}
