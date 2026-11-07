export const prerender = false

import type { APIContext } from 'astro'
import { json, error, randomId } from '../../../../../backend/lib/admin/api.ts'
import { listAllNews, createNews } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const items = await listAllNews()
  return json({ news: items })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const id = randomId()
  await createNews(id, {
    title: String(body.title ?? ''),
    content: String(body.content ?? ''),
    summary: String(body.summary ?? ''),
    pub_date: body.pub_date ? String(body.pub_date) : null,
    category: String(body.category ?? ''),
    tags: String(body.tags ?? '[]'),
    status: String(body.status ?? 'draft'),
    sort_order: Number(body.sort_order ?? 0),
  })

  return json({ id }, 201)
}
