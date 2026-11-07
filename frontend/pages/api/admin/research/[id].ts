export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { updateResearch, deleteResearch } from '../../../../../backend/lib/admin/db.ts'

export async function PUT(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  await updateResearch(id, {
    title: String(body.title ?? ''),
    content: String(body.content ?? ''),
    icon: String(body.icon ?? ''),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')
  await deleteResearch(id)
  return json({ ok: true })
}
