/** Browser-safe matching shared by the resource library and news filters. */
export interface CatalogItem { text: string; categories: string[]; year?: string }
export interface CatalogFilters { q: string; type: string; year: string }
export function matchesCatalogItem(item: CatalogItem, filters: CatalogFilters): boolean {
  const words = filters.q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = item.text.toLocaleLowerCase();
  return words.every((word) => text.includes(word))
    && (!filters.type || item.categories.includes(filters.type))
    && (!filters.year || item.year === filters.year);
}
export function parseCatalogFilters(params: URLSearchParams, types: string[], years: string[]): CatalogFilters {
  const type = params.get('type') ?? '';
  const year = params.get('year') ?? '';
  return { q: (params.get('q') ?? '').slice(0, 240), type: types.includes(type) ? type : '', year: years.includes(year) ? year : '' };
}
