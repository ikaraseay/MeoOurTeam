#!/usr/bin/env node
/**
 * 构建期导出 —— 把 D1 的数据导成原始前端需要的格式
 * 
 * 生成：
 * - data/runtime/site-content.json (管理内容)
 * - data/content/blog/*.md (博客文章)
 * 
 * 用法：
 *   node backend/scripts/export-d1-posts.mjs           # 从远程 D1 导出
 *   node backend/scripts/export-d1-posts.mjs --local   # 从本地 D1 导出
 *   node backend/scripts/export-d1-posts.mjs --ensure  # 只确保目录存在
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import identityDefaults from '../../frontend/lib/site-identity-defaults.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const DATA_DIR = join(ROOT, 'data')
const RUNTIME_DIR = join(DATA_DIR, 'runtime')
const BLOG_DIR = join(DATA_DIR, 'content/blog')

const useLocal = process.argv.includes('--local')
const ensureOnly = process.argv.includes('--ensure')

// 确保目录存在
for (const dir of [DATA_DIR, RUNTIME_DIR, BLOG_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const identityPath = join(RUNTIME_DIR, 'site-identity.json')
if (ensureOnly) {
  if (!existsSync(identityPath)) writeFileSync(identityPath, '{}\n')
  // 无 D1 访问的干净检出（如 CI）也要能通过 astro check，写入与真实导出一致的空快照。
  const ensureFiles = {
    'site-content.json': {
      peopleGroups: [],
      researchDirections: [],
      projects: [],
      publications: [],
      outcomeFiles: [],
      introductionVideos: [],
      homepage: { researchDirections: true, researchHighlights: true, latestNews: true, joinTeam: true },
    },
    'published-text.json': {},
    'site-contact.json': {},
  }
  for (const [name, value] of Object.entries(ensureFiles)) {
    const file = join(RUNTIME_DIR, name)
    if (!existsSync(file)) writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
  }
  console.log('[export] 目录已确保')
  process.exit(0)
}

// =============================================================================
// D1 查询
// =============================================================================

function loadConfigToken() {
  // 本地直接跑 pnpm build 时也从 config.env 取同一个 Token，避免再登录一次。
  if (process.env.D1_REMOTE_TOKEN || process.env.CLOUDFLARE_API_TOKEN) return
  try {
    const source = readFileSync(join(ROOT, 'config.env'), 'utf-8')
    const match = source.match(/^\s*CLOUDFLARE_API_TOKEN\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/m)
    const value = match?.[1] || match?.[2] || match?.[3]
    if (value) process.env.CLOUDFLARE_API_TOKEN = value
  } catch {
    // CI 等无 config.env 的环境继续使用 wrangler 现有凭据
  }
}

function queryD1(sql) {
  loadConfigToken()
  const wrangler = join(ROOT, 'node_modules/.bin/wrangler')
  const configPath = join(ROOT, 'cloudflare/wrangler.jsonc')
  const config = JSON.parse(readFileSync(configPath, 'utf-8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
  const dbName = config.d1_databases[0].database_name
  
  const flag = useLocal ? '--local' : '--remote'
  const cmd = `cd "${join(ROOT, 'cloudflare')}" && ${wrangler} d1 execute ${dbName} ${flag} --command=${JSON.stringify(sql)} --json`

  // 构建环境注入同一个 Token 用于读 D1，部署仍走 Workers Builds 的 Build Token。
  const env = process.env.D1_REMOTE_TOKEN
    ? { ...process.env, CLOUDFLARE_API_TOKEN: process.env.D1_REMOTE_TOKEN }
    : process.env
  
  try {
    const output = execFileSync('sh', ['-c', cmd], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, env })
    const result = JSON.parse(output)
    return Array.isArray(result) && result[0]?.results ? result[0].results : []
  } catch (err) {
    // 云构建里失败必须终止，否则会把空内容发布上线。
    if (process.env.WORKERS_CI) throw new Error(`D1 查询失败：${err.message}`)
    console.warn('[export] D1 查询失败:', err.message)
    return []
  }
}

function safeJsonParse(value) {
  try { return JSON.parse(value) } catch { return [] }
}

// =============================================================================
// 导出数据
// =============================================================================

console.log('[export] 从 D1 导出数据...')

// 成员 - 导出所有活跃成员，按角色分组
const membersRows = queryD1('SELECT * FROM members WHERE is_active = 1 ORDER BY sort_order')

// 根据实际角色智能分组
function categorizeMembers(members) {
  const groups = {
    pi: [],
    faculty: [],
    postdocs: [],
    phd: [],
    masters: [],
    other: []
  }
  
  for (const m of members) {
    const role = (m.role || '').toLowerCase()
    if (role.includes('教授') && !role.includes('副')) {
      groups.pi.push(m)
    } else if (role.includes('副教授') || role.includes('教师') || role.includes('讲师')) {
      groups.faculty.push(m)
    } else if (role.includes('博士后')) {
      groups.postdocs.push(m)
    } else if (role.includes('博士')) {
      groups.phd.push(m)
    } else if (role.includes('硕士')) {
      groups.masters.push(m)
    } else {
      groups.other.push(m)
    }
  }
  
  return groups
}

const memberGroups = categorizeMembers(membersRows)

const peopleGroups = [
  {
    id: 'pi',
    title: 'PI 负责人',
    people: memberGroups.pi.map(m => ({
      name: m.name,
      role: m.role,
      focus: m.bio?.split('\n')[0] || '',
      email: m.email || '',
      homepage: m.homepage || '',
      photo: m.avatar_key || '',
      bio: m.bio || '',
    })),
  },
  {
    id: 'faculty',
    title: '专任教师',
    people: memberGroups.faculty.map(m => ({
      name: m.name,
      role: m.role,
      focus: m.bio?.split('\n')[0] || '',
      email: m.email || '',
      homepage: m.homepage || '',
      photo: m.avatar_key || '',
      bio: m.bio || '',
    })),
  },
  {
    id: 'postdocs',
    title: '博士后',
    people: memberGroups.postdocs.map(m => ({
      name: m.name,
      role: m.role,
      focus: m.bio?.split('\n')[0] || '',
      email: m.email || '',
      homepage: m.homepage || '',
      photo: m.avatar_key || '',
      bio: m.bio || '',
    })),
  },
  {
    id: 'phd',
    title: '博士生',
    people: memberGroups.phd.map(m => ({
      name: m.name,
      role: m.role,
      focus: m.bio?.split('\n')[0] || '',
      email: m.email || '',
      homepage: m.homepage || '',
      photo: m.avatar_key || '',
      bio: m.bio || '',
    })),
  },
  {
    id: 'masters',
    title: '硕士生',
    people: memberGroups.masters.map(m => ({
      name: m.name,
      role: m.role,
      focus: m.bio?.split('\n')[0] || '',
      email: m.email || '',
      homepage: m.homepage || '',
      photo: m.avatar_key || '',
      bio: m.bio || '',
    })),
  },
].filter(g => g.people.length > 0) // 只保留有人的分组

// 研究方向
const researchRows = queryD1('SELECT * FROM research_directions WHERE is_active = 1 ORDER BY sort_order')
const researchDirections = researchRows.map(r => ({
  id: r.id,
  title: r.title,
  content: r.content,
  advantage: '',
  scene: '',
  image: r.icon || '',
  imageCaption: '',
}))

// 项目
const projectsRows = queryD1('SELECT * FROM projects WHERE is_active = 1 ORDER BY sort_order')
const projects = projectsRows.map(p => {
  const match = p.description?.match(/关键词：(.+)$/)
  const keywords = match ? match[1].split('、') : []
  const sourceMatch = p.description?.match(/^(.+?)。关键词/)
  const source = sourceMatch ? sourceMatch[1] : p.category || ''
  return {
    startYear: parseInt(p.created_at?.slice(0, 4)) || new Date().getFullYear(),
    title: p.name,
    source,
    keywords,
  }
})

// 成果（论文）
const outcomesRows = queryD1("SELECT * FROM outcomes WHERE is_active = 1 AND type = 'paper' ORDER BY sort_order")
const publications = outcomesRows.map(o => {
  const authors = safeJsonParse(o.authors).join(', ')
  const tags = safeJsonParse(o.tags)
  const venue = tags[0] || ''
  const year = o.date || ''
  return {
    year,
    title: o.title,
    venue,
    area: '',
    file: o.pdf_key || '',
    authors,
    visible: true,
    rights: 'allowed',
    highlights: [],
    officialUrl: o.url || '',
    thumbnail: '',
    citation: o.description || '',
  }
})

// 成果（竞赛）
const awardsRows = queryD1("SELECT * FROM outcomes WHERE is_active = 1 AND type = 'award' ORDER BY sort_order")
const outcomeFiles = awardsRows.map(o => ({
  year: o.date?.slice(0, 4) || '',
  title: o.title,
  level: '',
  file: '',
  visible: true,
  pdfVisible: false,
  preview: o.url || '',
}))

// 设置
const settingsRows = queryD1('SELECT key, value FROM settings')
const settings = Object.fromEntries(settingsRows.map(s => [s.key, s.value]))

// 品牌图标：后台把自定义结果保存在 settings.site_identity，构建时展开为完整快照。
let siteIdentity = {}
if (settings.site_identity) {
  try {
    const stored = JSON.parse(settings.site_identity)
    if (stored && typeof stored === 'object') siteIdentity = stored
  } catch { /* invalid overrides fall back to defaults */ }
}
writeFileSync(identityPath, JSON.stringify({ ...identityDefaults, ...siteIdentity }, null, 2))
console.log(`[export] 已写入 ${identityPath}`)

// 联系信息：邮箱与招生文档属于隐私数据，保存在 D1 settings.site_contact，模板代码不含真实值。
let siteContact = {}
if (settings.site_contact) {
  try {
    const stored = JSON.parse(settings.site_contact)
    if (stored && typeof stored === 'object') siteContact = stored
  } catch { /* invalid overrides fall back to empty contact */ }
}
const siteContactPath = join(RUNTIME_DIR, 'site-contact.json')
writeFileSync(siteContactPath, JSON.stringify(siteContact, null, 2))
console.log(`[export] 已写入 ${siteContactPath}`)

// 管理后台把完整站点资料（含论文标签、公开状态、配图、视频等）保存在 settings.site_content，
// 表结构映射会丢失这些字段，因此发布时优先使用这份规范 JSON。
let storedContent = null
try { storedContent = settings.site_content ? JSON.parse(settings.site_content) : null } catch { storedContent = null }
const hasStoredContent = storedContent && ['peopleGroups', 'researchDirections', 'projects', 'publications', 'outcomeFiles', 'introductionVideos']
  .some((key) => Array.isArray(storedContent[key]) && storedContent[key].length > 0)

let homepage = {
  researchDirections: true,
  researchHighlights: true,
  latestNews: true,
  joinTeam: true,
}
if (settings.homepage) {
  try { homepage = { ...homepage, ...JSON.parse(settings.homepage) } } catch {}
}
if (storedContent?.homepage && typeof storedContent.homepage === 'object') {
  homepage = { ...homepage, ...storedContent.homepage }
}

// 构建 site-content.json
const siteContent = hasStoredContent
  ? {
      ...storedContent,
      peopleGroups: storedContent.peopleGroups ?? [],
      researchDirections: storedContent.researchDirections ?? [],
      projects: storedContent.projects ?? [],
      publications: storedContent.publications ?? [],
      outcomeFiles: storedContent.outcomeFiles ?? [],
      introductionVideos: storedContent.introductionVideos ?? [],
      homepage,
    }
  : {
      peopleGroups,
      researchDirections,
      projects,
      publications,
      outcomeFiles,
      introductionVideos: [],
      homepage,
    }

const siteContentPath = join(RUNTIME_DIR, 'site-content.json')
writeFileSync(siteContentPath, JSON.stringify(siteContent, null, 2))
console.log(`[export] 已写入 ${siteContentPath}`)

// 文案覆盖：构建时注入 __PUBLISHED_TEXT__，让后台草稿在发布后生效。
const textRows = queryD1("SELECT key, value FROM text_resources WHERE locale = 'zh'")
const publishedText = Object.fromEntries(textRows.map((row) => [row.key, row.value]))
const publishedTextPath = join(RUNTIME_DIR, 'published-text.json')
writeFileSync(publishedTextPath, JSON.stringify(publishedText, null, 2))
console.log(`[export] 已写入 ${publishedTextPath}（${textRows.length} 条覆盖）`)

// =============================================================================
// 导出博客文章
// =============================================================================

const documentsRows = queryD1("SELECT * FROM documents WHERE status = 'published' ORDER BY pub_date DESC")

// 清空旧的博客文件
const existingFiles = existsSync(BLOG_DIR) ? readdirSync(BLOG_DIR) : []
for (const f of existingFiles) {
  if (f.endsWith('.md')) {
    unlinkSync(join(BLOG_DIR, f))
  }
}

for (const doc of documentsRows) {
  const slug = doc.slug || ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue
  
  const tags = safeJsonParse(doc.tags || '[]')
  const frontmatter = [
    '---',
    `title: "${(doc.title || '').replace(/"/g, '\\"')}"`,
    `description: "${(doc.description || '').replace(/"/g, '\\"')}"`,
    `pubDate: ${doc.pub_date ? new Date(doc.pub_date).toISOString() : new Date().toISOString()}`,
    doc.updated_date ? `updatedDate: ${new Date(doc.updated_date).toISOString()}` : null,
    doc.category ? `category: "${(doc.category || '').replace(/"/g, '\\"')}"` : null,
    tags.length > 0 ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]` : null,
    `draft: false`,
    `license: "${doc.license || 'cc-by'}"`,
    '---',
    '',
    doc.body || '',
  ].filter(Boolean).join('\n')
  
  writeFileSync(join(BLOG_DIR, `${slug}.md`), frontmatter)
}

console.log(`[export] 导出完成：${documentsRows.length} 篇文章，${membersRows.length} 成员，${researchRows.length} 研究方向，${projectsRows.length} 项目，${outcomesRows.length} 论文，${awardsRows.length} 竞赛`)
