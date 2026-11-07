export const prerender = false

import type { APIContext } from 'astro'
import { json, error, randomId } from '../../../../../backend/lib/admin/api.ts'
import { listOutcomes, createOutcome } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const items = await listOutcomes()
  return json({ outcomes: items })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const id = randomId()
  await createOutcome(id, {
    title: String(body.title ?? ''),
    type: String(body.type ?? 'paper'),
    description: String(body.description ?? ''),
    url: String(body.url ?? ''),
    pdf_key: String(body.pdf_key ?? ''),
    date: body.date ? String(body.date) : null,
    authors: String(body.authors ?? '[]'),
    tags: String(body.tags ?? '[]'),
    sort_order: Number(body.sort_order ?? 0),
    is_active: body.is_active === false ? 0 : 1,
  })

  return json({ id }, 201)
}
