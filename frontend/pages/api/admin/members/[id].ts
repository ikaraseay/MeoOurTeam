export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { getMember, updateMember, deleteMember } from '../../../../../backend/lib/admin/db.ts'

export async function GET(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')
  const member = await getMember(id)
  if (!member) return error('not found', 404)
  return json({ member })
}

export async function PUT(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  await updateMember(id, {
    name: String(body.name ?? ''),
    role: String(body.role ?? ''),
    bio: String(body.bio ?? ''),
    avatar_key: String(body.avatar_key ?? ''),
    email: String(body.email ?? ''),
    homepage: String(body.homepage ?? ''),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')
  await deleteMember(id)
  return json({ ok: true })
}
