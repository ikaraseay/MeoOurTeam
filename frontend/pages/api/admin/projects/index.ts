export const prerender = false

import type { APIContext } from 'astro'
import { json, error, randomId } from '../../../../../backend/lib/admin/api.ts'
import { listProjects, createProject } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const items = await listProjects()
  return json({ projects: items })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const id = randomId()
  await createProject(id, {
    name: String(body.name ?? ''),
    description: String(body.description ?? ''),
    url: String(body.url ?? ''),
    category: String(body.category ?? ''),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ id }, 201)
}
