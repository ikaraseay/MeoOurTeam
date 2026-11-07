import defaults from './site-identity-defaults.json' with { type: 'json' };

export interface SiteIdentity {
  /** SVG favicon; also accepts PNG. */
  favicon: string;
  faviconPng: string;
  faviconIco: string;
  appleIcon: string;
  universityLogo: string;
  academyLogo: string;
  footerLogo: string;
  /** Empty keeps the default research visual. */
  socialImage: string;
  /** CSS color used for the mobile browser theme bar; empty omits the tag. */
  themeColor: string;
}

export const DEFAULT_SITE_IDENTITY: SiteIdentity = { ...defaults };

const assetKeys = [
  'favicon',
  'faviconPng',
  'faviconIco',
  'appleIcon',
  'universityLogo',
  'academyLogo',
  'footerLogo',
  'socialImage',
] as const;

function safeAsset(value: unknown): string {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  if (!clean || clean.length > 500) return '';
  if (clean.startsWith('/') && !clean.startsWith('//')) return clean;
  if (/^https:\/\/[^\s"'<>]+$/i.test(clean)) return clean;
  return '';
}

export function normalizeSiteIdentity(input: unknown): SiteIdentity {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const next = { ...DEFAULT_SITE_IDENTITY };
  for (const key of assetKeys) {
    const value = safeAsset(source[key]);
    if (value) next[key] = value;
  }
  const theme = typeof source.themeColor === 'string' ? source.themeColor.trim() : '';
  next.themeColor = /^#[0-9a-f]{3,8}$/i.test(theme) ? theme : '';
  return next;
}
