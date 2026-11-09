import snapshot from '../../data/runtime/site-contact.json' with { type: 'json' };

export interface SiteContact {
  /** 课题组公开联系邮箱；空值表示尚未在后台配置。 */
  email: string;
  /** 研究生申请邮件抄送地址。 */
  graduateCc: string[];
  /** 招生指南 PDF 路径（R2 /media/ 地址）。 */
  recruitmentDocument: string;
}

function safeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  if (!clean || clean.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean)) return '';
  return clean;
}

function safePath(value: unknown): string {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  if (!clean || clean.length > 500) return '';
  if (clean.startsWith('/') && !clean.startsWith('//')) return clean;
  return '';
}

export function normalizeSiteContact(input: unknown): SiteContact {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const graduateCc = Array.isArray(source.graduateCc)
    ? source.graduateCc.map(safeEmail).filter(Boolean).slice(0, 5)
    : [];
  return {
    email: safeEmail(source.email),
    graduateCc,
    recruitmentDocument: safePath(source.recruitmentDocument),
  };
}

export const siteContact = normalizeSiteContact(snapshot);
