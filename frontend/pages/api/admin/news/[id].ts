export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { updateNews, deleteNews } from '../../../../../backend/lib/admin/db.ts'

export async function PUT(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  await updateNews(id, {
    title: String(body.title ?? ''),
    content: String(body.content ?? ''),
    summary: String(body.summary ?? ''),
    pub_date: body.pub_date ? String(body.pub_date) : null,
    category: String(body.category ?? ''),
    tags: String(body.tags ?? '[]'),
    status: String(body.status ?? 'draft'),
    sort_order: Number(body.sort_order ?? 0),
  })

  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')
  await deleteNews(id)
  return json({ ok: true })
}
