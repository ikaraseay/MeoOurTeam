export const prerender = false

import type { APIContext } from 'astro'
import { json, error, randomId } from '../../../../../backend/lib/admin/api.ts'
import { listMembers, createMember } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const members = await listMembers()
  return json({ members })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const id = randomId()
  await createMember(id, {
    name: String(body.name ?? ''),
    role: String(body.role ?? ''),
    bio: String(body.bio ?? ''),
    avatar_key: String(body.avatar_key ?? ''),
    email: String(body.email ?? ''),
    homepage: String(body.homepage ?? ''),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ id }, 201)
}
