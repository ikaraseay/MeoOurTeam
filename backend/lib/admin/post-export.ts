/**
 * 文档导出为 Markdown —— 纯函数，Node 测试可直接 import。
 */

export function fileNameFor(row: { slug: string; locale: string }): string {
  return `${row.slug}.md`
}

export function renderMarkdownFile(row: Record<string, unknown>): string {
  const tags = safeJsonParse(String(row.tags ?? '[]'))
  const lines = [
    '---',
    `title: "${escapeYaml(String(row.title ?? ''))}"`,
    `description: "${escapeYaml(String(row.description ?? ''))}"`,
    `pubDate: ${row.pub_date ? new Date(String(row.pub_date)).toISOString() : new Date().toISOString()}`,
  ]
  if (row.updated_date) lines.push(`updatedDate: ${new Date(String(row.updated_date)).toISOString()}`)
  if (row.category) lines.push(`category: "${escapeYaml(String(row.category))}"`)
  if (tags.length > 0) lines.push(`tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]`)
  lines.push(`license: "${row.license ?? 'cc-by'}"`)
  lines.push('---')
  lines.push('')
  lines.push(String(row.body ?? ''))
  return lines.join('\n')
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"')
}

function safeJsonParse(value: string): string[] {
  try { return JSON.parse(value) } catch { return [] }
}
