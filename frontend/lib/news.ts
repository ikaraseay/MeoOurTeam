import { defaults, t } from './text-config.ts';
/** Stable IDs and stored tags are independent of editable display labels. */
export const newsCategories = [
  { value: 'news', key: 'news.text004' },
  { value: 'announcements', key: 'news.text005' },
  { value: 'admissions', key: 'news.text006' },
  { value: 'conferences', key: 'news.text007' },
  { value: 'talks', key: 'news.text008' },
  { value: 'awards', key: 'news.text009' },
] as const;
export function newsCategoryIds(tags: string[]): string[] {
  return newsCategories.filter(({ key }) => tags.includes(defaults[key])).map(({ value }) => value);
}
export const newsCategoryOptions = () => newsCategories.map(({ value, key }) => ({ value, label: t(key) }));
