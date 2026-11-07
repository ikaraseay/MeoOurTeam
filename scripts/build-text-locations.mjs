/**
 * 从构建产物里提取文案位置索引，供后台可视化定位使用。
 * 扫描 dist/client/**\/*.html 中的 data-copy / data-copy-attrs，
 * 输出「页面 → 区块 → key」映射；不修改前台模板。
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument, DomUtils } from 'htmlparser2'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist/client')
const OUTPUTS = [
  join(ROOT, 'data/runtime/text-locations.json'),
  join(ROOT, 'cloudflare/public/text-locations.json'),
  join(DIST, 'text-locations.json'),
]

const PAGE_LABELS = {
  '/': '首页',
  '/research/': '研究方向',
  '/members/': '团队成员',
  '/contact/': '联系与招生',
  '/outcomes/': '科研成果',
  '/news/': '新闻动态',
  '/projects/': '科研项目',
  '/blog/': '博客',
}
const PAGE_ORDER = Object.keys(PAGE_LABELS)

function listHtml(dir) {
  const files = []
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name)
    if (item.isDirectory()) files.push(...listHtml(full))
    else if (item.name.endsWith('.html')) files.push(full)
  }
  return files
}

function routeOf(file) {
  const rel = relative(DIST, file).split(sep).join('/')
  if (rel === 'index.html') return '/'
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`
  return `/${rel.replace(/\.html$/, '')}`
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function escapeIdent(value) {
  return String(value).replace(/([^\w-])/g, '\\$1')
}

function cssPath(el) {
  const parts = []
  let node = el
  while (node?.type === 'tag' && node.name !== 'html') {
    if (node.attribs?.id) {
      parts.unshift(`#${escapeIdent(node.attribs.id)}`)
      break
    }
    let part = node.name
    const parent = node.parent
    if (parent?.children) {
      const sameTag = parent.children.filter((child) => child.type === 'tag' && child.name === node.name)
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`
    }
    parts.unshift(part)
    node = parent
  }
  return parts.join(' > ')
}

function sectionOf(el) {
  let node = el.parent
  while (node && node.type !== 'root') {
    const attrs = node.attribs ?? {}
    if (attrs.id) return `#${attrs.id}`
    if (attrs['data-section']) return cleanText(attrs['data-section']).slice(0, 40)
    if (['section', 'header', 'footer', 'nav', 'aside', 'article'].includes(node.name)) {
      const heading = DomUtils.findOne(
        (child) => child.type === 'tag' && /^h[1-3]$/.test(child.name),
        node.children,
      )
      const text = heading ? cleanText(DomUtils.textContent(heading)).slice(0, 40) : ''
      if (text) return text
    }
    if (node.name === 'main' || node.name === 'body') break
    node = node.parent
  }
  return '页面'
}

function parseDescriptor(raw) {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && typeof value.key === 'string' ? value : null
  } catch {
    return null
  }
}

function entryFor(el, descriptor, section, type, extra = {}) {
  const entry = {
    key: descriptor.key,
    type,
    tag: el.name,
    section,
    selector: cssPath(el),
    snippet: cleanText(DomUtils.textContent(el)).slice(0, 100),
    ...extra,
  }
  if (descriptor.params && typeof descriptor.params === 'object') entry.params = descriptor.params
  return entry
}

function collectPage(file) {
  const html = readFileSync(file, 'utf-8')
  const document = parseDocument(html, { decodeEntities: true })
  const entries = []
  const route = routeOf(file)

  const walk = (node) => {
    if (!node || node.type === 'root') {
      for (const child of node?.children ?? []) walk(child)
      return
    }
    if (node.type !== 'tag') return

    const rawText = node.attribs?.['data-copy']
    const descriptor = parseDescriptor(rawText)
    if (descriptor) entries.push(entryFor(node, descriptor, sectionOf(node), 'text'))

    const rawAttrs = node.attribs?.['data-copy-attrs']
    if (rawAttrs) {
      try {
        const attributes = JSON.parse(rawAttrs)
        for (const [attr, raw] of Object.entries(attributes ?? {})) {
          const attrDescriptor = parseDescriptor(typeof raw === 'string' ? raw : JSON.stringify(raw))
          if (!attrDescriptor) continue
          const metaKey = node.name === 'meta'
            ? (node.attribs?.name ? `name="${node.attribs.name}"` : node.attribs?.property ? `property="${node.attribs.property}"` : '')
            : ''
          const entry = entryFor(node, attrDescriptor, '页面属性', 'attr', {
            attr,
            target: `${node.name}${metaKey ? `[${metaKey}]` : ''}`,
          })
          entry.snippet = cleanText(node.attribs?.[attr] ?? entry.snippet).slice(0, 100)
          entries.push(entry)
        }
      } catch {
        // 忽略无法解析的属性描述符，继续扫描其余位置
      }
    }

    for (const child of node.children ?? []) walk(child)
  }
  walk(document)

  const totals = new Map()
  for (const entry of entries) totals.set(entry.key, (totals.get(entry.key) ?? 0) + 1)
  const seen = new Map()
  for (const entry of entries) {
    const occurrence = (seen.get(entry.key) ?? 0) + 1
    seen.set(entry.key, occurrence)
    entry.occurrence = occurrence
    entry.total = totals.get(entry.key)
  }

  return { route, label: PAGE_LABELS[route] ?? route, entries }
}

function orderPages(pages) {
  return pages.sort((a, b) => {
    const ai = PAGE_ORDER.indexOf(a.route)
    const bi = PAGE_ORDER.indexOf(b.route)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    return a.route.localeCompare(b.route)
  })
}

function writeIndex(pages) {
  const keys = new Set()
  let entryCount = 0
  for (const page of pages) {
    for (const entry of page.entries) {
      keys.add(entry.key)
      entryCount += 1
    }
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    stats: { pages: pages.length, entries: entryCount, keys: keys.size },
    pages,
  }
  const text = JSON.stringify(payload, null, 2)
  for (const output of OUTPUTS) {
    if (output.startsWith(DIST) && !existsSync(DIST)) continue
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, text)
  }
  console.log(`[locations] ${pages.length} 个页面，${entryCount} 个位置，${keys.size} 个 key`)
}

function main() {
  if (!existsSync(DIST)) {
    writeIndex([])
    console.log('[locations] 未找到 dist/client，已写入空索引（构建后会重新生成）')
    return
  }
  const pages = orderPages(listHtml(DIST).map(collectPage).filter((page) => page.entries.length > 0))
  writeIndex(pages)
}

main()
