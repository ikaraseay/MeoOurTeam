export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { updateProject, deleteProject } from '../../../../../backend/lib/admin/db.ts'

export async function PUT(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  await updateProject(id, {
    name: String(body.name ?? ''),
    description: String(body.description ?? ''),
    url: String(body.url ?? ''),
    category: String(body.category ?? ''),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')
  await deleteProject(id)
  return json({ ok: true })
}
