/** Default UI copy lives in src/lib; production overrides live in BLOG_DATA_DIR.
 * Keys are module.name identifiers. {name} placeholders must be preserved.
 * Business content (articles, people, papers) remains in its dedicated editor.
 */
import defaults from './text-defaults.json' with { type: 'json' };
export type TextKey = keyof typeof defaults;
export type TextParams = Record<string, string | number>;
export type TextCatalog = Record<string, string>;
export { defaults };
// Replaced by Vite during each publication; Node admin tools use the defaults.
declare const __PUBLISHED_TEXT__: TextCatalog;
const clientCatalog: TextCatalog = { ...defaults, ...(typeof __PUBLISHED_TEXT__ === "undefined" ? {} : __PUBLISHED_TEXT__) };
export function formatText(value: string, params: TextParams = {}): string {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => String(params[key] ?? match));
}
export function t(key: TextKey, params: TextParams = {}): string {
  return formatText(clientCatalog[key] ?? defaults[key] ?? key, params);
}
export function textDynamic(key: string, params: TextParams = {}): string {
  return formatText(clientCatalog[key] ?? key, params);
}
// Bind a default display value to its key at build time. Call only for UI copy,
// never for user-authored article bodies or managed content.
const reverse = new Map<string, string>();
for (const [key, value] of Object.entries(defaults)) if (!reverse.has(value)) reverse.set(value, key);
export function binding(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const key = reverse.get(value);
  if (key) return JSON.stringify({ key });
  for (const [key, template] of Object.entries(defaults)) {
    if (!template.includes('{')) continue;
    const names: string[] = [];
    const pattern = template.split(/(\{[a-zA-Z0-9_]+\})/).map((part) => {
      if (/^\{[a-zA-Z0-9_]+\}$/.test(part)) { names.push(part.slice(1, -1)); return '([\\s\\S]*?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    const match = value.match(new RegExp(`^${pattern}$`));
    if (match) return JSON.stringify({ key, params: Object.fromEntries(names.map((name, i) => [name, match[i + 1]])) });
  }
}

/** Format a bound message; translate nested UI values without interpreting HTML. */
export function renderBoundText(descriptor: { key: string; params?: TextParams; literalParams?: string[] }, values: TextCatalog): string {
  const params = Object.fromEntries(Object.entries(descriptor.params ?? {}).map(([name, value]) => {
    const key = typeof value === 'string' && !descriptor.literalParams?.includes(name) ? reverse.get(value) : undefined;
    return [name, key ? (values[key] ?? value) : value];
  }));
  return formatText(values[descriptor.key] ?? descriptor.key, params);
}
