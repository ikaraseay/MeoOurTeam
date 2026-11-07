export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { listTexts, upsertText, listTextModules } from '../../../../../backend/lib/admin/db.ts'

export async function GET(context: APIContext): Promise<Response> {
  const module = context.url.searchParams.get('module') || undefined
  const locale = context.url.searchParams.get('locale') || 'zh'
  
  const [texts, modules] = await Promise.all([
    listTexts(module, locale),
    listTextModules(),
  ])
  
  return json({ texts, modules, currentModule: module, currentLocale: locale })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const module = String(body.module ?? '')
  const key = String(body.key ?? '')
  const value = String(body.value ?? '')
  const locale = String(body.locale ?? 'zh')
  
  if (!module || !key) {
    return error('missing module or key')
  }
  
  await upsertText(module, key, value, locale, 'admin', false)
  
  return json({ ok: true }, 201)
}
