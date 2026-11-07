export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { getText, upsertText, deleteText } from '../../../../../backend/lib/admin/db.ts'

export async function GET(context: APIContext): Promise<Response> {
  const module = context.url.searchParams.get('module') || ''
  const key = context.params.key || context.url.searchParams.get('key') || ''
  const locale = context.url.searchParams.get('locale') || 'zh'
  
  if (!module || !key) {
    return error('missing module or key')
  }
  
  const text = await getText(module, key, locale)
  if (!text) {
    return error('not found', 404)
  }
  
  return json({ text })
}

export async function PUT(context: APIContext): Promise<Response> {
  const module = context.url.searchParams.get('module') || ''
  const key = context.params.key || context.url.searchParams.get('key') || ''
  const locale = context.url.searchParams.get('locale') || 'zh'
  
  if (!module || !key) {
    return error('missing module or key')
  }
  
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }
  
  const value = String(body.value ?? '')
  await upsertText(module, key, value, locale, 'admin', false)
  
  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const module = context.url.searchParams.get('module') || ''
  const key = context.params.key || context.url.searchParams.get('key') || ''
  const locale = context.url.searchParams.get('locale') || 'zh'
  
  if (!module || !key) {
    return error('missing module or key')
  }
  
  await deleteText(module, key, locale, 'admin')
  
  return json({ ok: true })
}
