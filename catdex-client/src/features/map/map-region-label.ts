export function formatMapRegionName(value: string) {
  return value.replace('부천시 ', '').replace(' 근처', '').trim();
}
