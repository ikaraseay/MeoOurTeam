/**
 * D1 访问 —— Worker 专用薄封装。
 * ⚠️ 这个模块 import 了 cloudflare:workers，Node 测试里跑不了。
 */

import { env } from 'cloudflare:workers'
import textDefaults from '../../../frontend/lib/text-defaults.json' with { type: 'json' }

export interface DocumentRecord {
  id: string
  slug: string
  locale: string
  title: string
  description: string
  body: string
  pub_date: string | null
  updated_date: string | null
  status: string
  category: string | null
  tags: string
  license: string
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface MemberRecord {
  id: string
  name: string
  role: string
  bio: string
  avatar_key: string
  email: string
  homepage: string
  sort_order: number
  is_active: number
  created_at: string
}

export interface ResearchRecord {
  id: string
  title: string
  content: string
  icon: string
  sort_order: number
  is_active: number
  created_at: string
}

export interface ProjectRecord {
  id: string
  name: string
  description: string
  url: string
  category: string
  sort_order: number
  is_active: number
  created_at: string
}

export interface OutcomeRecord {
  id: string
  title: string
  type: string
  description: string
  url: string
  pdf_key: string
  date: string | null
  authors: string
  tags: string
  sort_order: number
  is_active: number
  created_at: string
}

export interface NewsRecord {
  id: string
  title: string
  content: string
  summary: string
  pub_date: string | null
  category: string
  tags: string
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MediaRecord {
  id: string
  key: string
  filename: string
  mime: string
  size: number
  alt: string
  created_at: string
}

export interface LoginAttempt {
  count: number
  window_at: string
}

export interface SettingRecord {
  key: string
  value: string
  updated_at: string
}

export function secret(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : ''
}

export function mediaBucket(): R2Bucket {
  return env.MEDIA
}

export function clientIp(request: Request): string {
  const direct = request.headers.get('CF-Connecting-IP')
  if (direct) return direct
  const forwarded = request.headers.get('X-Forwarded-For')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

/* ---------------- 文档 ---------------- */

const DOC_COLUMNS =
  'id, slug, locale, title, description, body, pub_date, updated_date, status, category, tags, license, created_at, updated_at, published_at'

export async function listDocuments(): Promise<DocumentRecord[]> {
  const result = await env.DB.prepare(
    'SELECT ' + DOC_COLUMNS + ' FROM documents ORDER BY updated_at DESC',
  ).all<DocumentRecord>()
  return result.results ?? []
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  return env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first<DocumentRecord>()
}

export async function createDocument(id: string, values: Partial<DocumentRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO documents (${DOC_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      id,
      values.slug ?? '',
      values.locale ?? 'zh',
      values.title ?? '',
      values.description ?? '',
      values.body ?? '',
      values.pub_date ?? null,
      values.updated_date ?? null,
      values.category ?? null,
      values.tags ?? '[]',
      values.license ?? 'cc-by',
      now,
      now,
    )
    .run()
}

export async function updateDocument(id: string, values: Partial<DocumentRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    `UPDATE documents SET slug = ?, locale = ?, title = ?, description = ?, body = ?,
     pub_date = ?, updated_date = ?, category = ?, tags = ?, license = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(
      values.slug ?? '',
      values.locale ?? 'zh',
      values.title ?? '',
      values.description ?? '',
      values.body ?? '',
      values.pub_date ?? null,
      values.updated_date ?? null,
      values.category ?? null,
      values.tags ?? '[]',
      values.license ?? 'cc-by',
      now,
      id,
    )
    .run()
}

export async function setDocumentStatus(id: string, status: string): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE documents SET status = ?, published_at = ?, updated_at = ? WHERE id = ?',
  )
    .bind(status, status === 'published' ? now : null, now, id)
    .run()
}

export async function deleteDocument(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run()
}

/* ---------------- 成员 ---------------- */

export async function listMembers(): Promise<MemberRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM members ORDER BY sort_order ASC, created_at ASC',
  ).all<MemberRecord>()
  return result.results ?? []
}

export async function getMember(id: string): Promise<MemberRecord | null> {
  return env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first<MemberRecord>()
}

export async function createMember(id: string, values: Partial<MemberRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO members (id, name, role, bio, avatar_key, email, homepage, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      values.name ?? '',
      values.role ?? '',
      values.bio ?? '',
      values.avatar_key ?? '',
      values.email ?? '',
      values.homepage ?? '',
      values.sort_order ?? 0,
      values.is_active ?? 1,
      now,
    )
    .run()
}

export async function updateMember(id: string, values: Partial<MemberRecord>): Promise<void> {
  await env.DB.prepare(
    'UPDATE members SET name = ?, role = ?, bio = ?, avatar_key = ?, email = ?, homepage = ?, sort_order = ?, is_active = ? WHERE id = ?',
  )
    .bind(
      values.name ?? '',
      values.role ?? '',
      values.bio ?? '',
      values.avatar_key ?? '',
      values.email ?? '',
      values.homepage ?? '',
      values.sort_order ?? 0,
      values.is_active ?? 1,
      id,
    )
    .run()
}

export async function deleteMember(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run()
}

/* ---------------- 研究方向 ---------------- */

export async function listResearch(): Promise<ResearchRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM research_directions ORDER BY sort_order ASC',
  ).all<ResearchRecord>()
  return result.results ?? []
}

export async function createResearch(id: string, values: Partial<ResearchRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO research_directions (id, title, content, icon, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, values.title ?? '', values.content ?? '', values.icon ?? '', values.sort_order ?? 0, values.is_active ?? 1, now)
    .run()
}

export async function updateResearch(id: string, values: Partial<ResearchRecord>): Promise<void> {
  await env.DB.prepare(
    'UPDATE research_directions SET title = ?, content = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?',
  )
    .bind(values.title ?? '', values.content ?? '', values.icon ?? '', values.sort_order ?? 0, values.is_active ?? 1, id)
    .run()
}

export async function deleteResearch(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM research_directions WHERE id = ?').bind(id).run()
}

/* ---------------- 项目 ---------------- */

export async function listProjects(): Promise<ProjectRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC',
  ).all<ProjectRecord>()
  return result.results ?? []
}

export async function createProject(id: string, values: Partial<ProjectRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO projects (id, name, description, url, category, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, values.name ?? '', values.description ?? '', values.url ?? '', values.category ?? '', values.sort_order ?? 0, values.is_active ?? 1, now)
    .run()
}

export async function updateProject(id: string, values: Partial<ProjectRecord>): Promise<void> {
  await env.DB.prepare(
    'UPDATE projects SET name = ?, description = ?, url = ?, category = ?, sort_order = ?, is_active = ? WHERE id = ?',
  )
    .bind(values.name ?? '', values.description ?? '', values.url ?? '', values.category ?? '', values.sort_order ?? 0, values.is_active ?? 1, id)
    .run()
}

export async function deleteProject(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
}

/* ---------------- 成果 ---------------- */

export async function listOutcomes(): Promise<OutcomeRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM outcomes WHERE is_active = 1 ORDER BY sort_order ASC, date DESC',
  ).all<OutcomeRecord>()
  return result.results ?? []
}

export async function createOutcome(id: string, values: Partial<OutcomeRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO outcomes (id, title, type, description, url, pdf_key, date, authors, tags, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, values.title ?? '', values.type ?? 'paper', values.description ?? '', values.url ?? '', values.pdf_key ?? '', values.date ?? null, values.authors ?? '[]', values.tags ?? '[]', values.sort_order ?? 0, values.is_active ?? 1, now)
    .run()
}

export async function updateOutcome(id: string, values: Partial<OutcomeRecord>): Promise<void> {
  await env.DB.prepare(
    'UPDATE outcomes SET title = ?, type = ?, description = ?, url = ?, pdf_key = ?, date = ?, authors = ?, tags = ?, sort_order = ?, is_active = ? WHERE id = ?',
  )
    .bind(values.title ?? '', values.type ?? 'paper', values.description ?? '', values.url ?? '', values.pdf_key ?? '', values.date ?? null, values.authors ?? '[]', values.tags ?? '[]', values.sort_order ?? 0, values.is_active ?? 1, id)
    .run()
}

export async function deleteOutcome(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM outcomes WHERE id = ?').bind(id).run()
}

/* ---------------- 新闻 ---------------- */

export async function listNews(): Promise<NewsRecord[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM news WHERE status = 'published' ORDER BY pub_date DESC",
  ).all<NewsRecord>()
  return result.results ?? []
}

export async function listAllNews(): Promise<NewsRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM news ORDER BY updated_at DESC',
  ).all<NewsRecord>()
  return result.results ?? []
}

export async function createNews(id: string, values: Partial<NewsRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO news (id, title, content, summary, pub_date, category, tags, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, values.title ?? '', values.content ?? '', values.summary ?? '', values.pub_date ?? null, values.category ?? '', values.tags ?? '[]', values.status ?? 'draft', values.sort_order ?? 0, now, now)
    .run()
}

export async function updateNews(id: string, values: Partial<NewsRecord>): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE news SET title = ?, content = ?, summary = ?, pub_date = ?, category = ?, tags = ?, status = ?, sort_order = ?, updated_at = ? WHERE id = ?',
  )
    .bind(values.title ?? '', values.content ?? '', values.summary ?? '', values.pub_date ?? null, values.category ?? '', values.tags ?? '[]', values.status ?? 'draft', values.sort_order ?? 0, now, id)
    .run()
}

export async function deleteNews(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(id).run()
}

/* ---------------- 设置 ---------------- */

export async function listSettings(): Promise<SettingRecord[]> {
  const result = await env.DB.prepare('SELECT key, value, updated_at FROM settings').all<SettingRecord>()
  return result.results ?? []
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
    .bind(key, value, new Date().toISOString())
    .run()
}

export async function deleteSetting(key: string): Promise<void> {
  await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run()
}

/* ---------------- 图库 ---------------- */

export async function listMedia(): Promise<MediaRecord[]> {
  const result = await env.DB.prepare('SELECT * FROM media ORDER BY created_at DESC').all<MediaRecord>()
  return result.results ?? []
}

export async function createMedia(record: MediaRecord): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO media (id, key, filename, mime, size, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(record.id, record.key, record.filename, record.mime, record.size, record.alt, record.created_at)
    .run()
}

export async function deleteMedia(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run()
}

/* ---------------- 登录限流 ---------------- */

export async function getLoginAttempt(ip: string): Promise<LoginAttempt> {
  const row = await env.DB.prepare('SELECT count, window_at FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first<LoginAttempt>()
  return row ?? { count: 0, window_at: new Date(0).toISOString() }
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const now = Date.now()
  const current = await getLoginAttempt(ip)
  const expired = now - new Date(current.window_at).getTime() >= 10 * 60 * 1000
  const count = expired ? 1 : current.count + 1
  const windowAt = expired ? new Date(now).toISOString() : current.window_at
  await env.DB.prepare(
    'INSERT INTO login_attempts (ip, count, window_at) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET count = excluded.count, window_at = excluded.window_at',
  )
    .bind(ip, count, windowAt)
    .run()
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()
}

/* ---------------- 文案管理 ---------------- */

export interface TextResource {
  id: string
  module: string
  key: string
  value: string
  locale: string
  is_default: number
  created_at: string | null
  updated_at: string | null
}

export interface TextEntry extends TextResource {
  builtin: boolean
  overridden: boolean
  default_value: string | null
}

const builtinTexts = textDefaults as Record<string, string>

function moduleOf(key: string): string {
  return key.split('.')[0]
}

export interface TextAudit {
  id: number
  action: string
  module: string
  key: string
  locale: string
  old_value: string | null
  new_value: string | null
  actor: string
  created_at: string
}

export async function listTexts(module?: string, locale: string = 'zh'): Promise<TextEntry[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM text_resources WHERE locale = ? ORDER BY module, key'
  )
    .bind(locale)
    .all<TextResource>()

  const rows = result.results ?? []
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const entries: TextEntry[] = []

  // 内置默认文案与 D1 覆盖值合并：没有覆盖时返回默认值，有覆盖时返回草稿值。
  if (locale === 'zh') {
    for (const [key, defaultValue] of Object.entries(builtinTexts)) {
      const entryModule = moduleOf(key)
      if (module && entryModule !== module) continue
      const row = byKey.get(key)
      if (row) {
        byKey.delete(key)
        entries.push({
          ...row,
          module: entryModule,
          builtin: true,
          overridden: true,
          default_value: defaultValue,
          is_default: 1,
        })
      } else {
        entries.push({
          id: `default:${key}`,
          module: entryModule,
          key,
          value: defaultValue,
          locale,
          is_default: 1,
          builtin: true,
          overridden: false,
          default_value: defaultValue,
          created_at: null,
          updated_at: null,
        })
      }
    }
  }

  for (const row of byKey.values()) {
    if (module && row.module !== module) continue
    entries.push({ ...row, builtin: false, overridden: false, default_value: null, is_default: 0 })
  }

  entries.sort((a, b) => a.module.localeCompare(b.module) || a.key.localeCompare(b.key))
  return entries
}

export async function getText(module: string, key: string, locale: string = 'zh'): Promise<TextResource | null> {
  return env.DB.prepare('SELECT * FROM text_resources WHERE module = ? AND key = ? AND locale = ?')
    .bind(module, key, locale)
    .first<TextResource>()
}

export async function upsertText(
  module: string,
  key: string,
  value: string,
  locale: string = 'zh',
  actor: string = 'admin',
  isDefault: boolean = false
): Promise<void> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const builtin = locale === 'zh' && Object.hasOwn(builtinTexts, key)
  
  const existing = await getText(module, key, locale)
  
  await env.DB.prepare(
    `INSERT INTO text_resources (id, module, key, value, locale, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(module, key, locale) DO UPDATE SET
       value = excluded.value,
       is_default = excluded.is_default,
       updated_at = excluded.updated_at`
  )
    .bind(id, module, key, value, locale, builtin || isDefault ? 1 : 0, now, now)
    .run()
  
  await recordTextAudit(
    existing ? 'update' : 'create',
    module,
    key,
    locale,
    existing?.value ?? (builtin ? builtinTexts[key] : null),
    value,
    actor
  )
}

export async function deleteText(module: string, key: string, locale: string = 'zh', actor: string = 'admin'): Promise<void> {
  const existing = await getText(module, key, locale)
  if (existing) {
    const builtin = locale === 'zh' && Object.hasOwn(builtinTexts, key)
    await env.DB.prepare('DELETE FROM text_resources WHERE module = ? AND key = ? AND locale = ?')
      .bind(module, key, locale)
      .run()
    
    await recordTextAudit(
      builtin ? 'reset' : 'delete',
      module,
      key,
      locale,
      existing.value,
      builtin ? builtinTexts[key] : null,
      actor
    )
  }
}

export async function listTextAudit(limit: number = 100): Promise<TextAudit[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM text_audit ORDER BY created_at DESC LIMIT ?'
  )
    .bind(limit)
    .all<TextAudit>()
  return result.results ?? []
}

async function recordTextAudit(
  action: string,
  module: string,
  key: string,
  locale: string,
  oldValue: string | null,
  newValue: string | null,
  actor: string
): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO text_audit (action, module, key, locale, old_value, new_value, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(action, module, key, locale, oldValue, newValue, actor, now)
    .run()
}

export async function listTextModules(): Promise<string[]> {
  const result = await env.DB.prepare('SELECT DISTINCT module FROM text_resources ORDER BY module').all<{ module: string }>()
  const modules = new Set((result.results ?? []).map((row) => row.module))
  for (const key of Object.keys(builtinTexts)) modules.add(moduleOf(key))
  return [...modules].sort()
}

/* ---------------- 发布管理 ---------------- */

export interface Release {
  id: string
  version: string
  status: string
  build_log: string | null
  created_at: string
  completed_at: string | null
  created_by: string
}

export async function listReleases(limit: number = 50): Promise<Release[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM releases ORDER BY created_at DESC LIMIT ?'
  )
    .bind(limit)
    .all<Release>()
  return result.results ?? []
}

export async function getRelease(version: string): Promise<Release | null> {
  return env.DB.prepare('SELECT * FROM releases WHERE version = ?')
    .bind(version)
    .first<Release>()
}

export async function createRelease(version: string, createdBy: string = 'admin'): Promise<Release> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  await env.DB.prepare(
    'INSERT INTO releases (id, version, status, created_at, created_by) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, version, 'building', now, createdBy)
    .run()
  
  return { id, version, status: 'building', build_log: null, created_at: now, completed_at: null, created_by }
}

export async function updateReleaseStatus(
  version: string,
  status: string,
  buildLog?: string
): Promise<void> {
  const now = status === 'success' || status === 'failed' ? new Date().toISOString() : null
  
  await env.DB.prepare(
    'UPDATE releases SET status = ?, build_log = ?, completed_at = ? WHERE version = ?'
  )
    .bind(status, buildLog || null, now, version)
    .run()
}

export async function getCurrentRelease(): Promise<Release | null> {
  const current = await env.DB.prepare('SELECT version FROM current_release WHERE id = 1').first<{ version: string }>()
  if (!current) return null
  return getRelease(current.version)
}

export async function activateRelease(version: string): Promise<void> {
  const now = new Date().toISOString()
  
  await env.DB.prepare(
    `INSERT INTO current_release (id, version, activated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET version = excluded.version, activated_at = excluded.activated_at`
  )
    .bind(version, now)
    .run()
  
  await updateReleaseStatus(version, 'activated')
}

export async function getPreviousRelease(): Promise<Release | null> {
  const current = await getCurrentRelease()
  if (!current) return null
  
  const result = await env.DB.prepare(
    'SELECT * FROM releases WHERE version < ? AND status = ? ORDER BY version DESC LIMIT 1'
  )
    .bind(current.version, 'activated')
    .first<Release>()
  
  return result ?? null
}
