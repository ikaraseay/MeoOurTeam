export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../backend/lib/admin/api.ts'
import { assembleSiteContent, replaceSiteContent, type SiteContent } from '../../../../backend/lib/admin/site-content.ts'

export async function GET(): Promise<Response> {
  const content = await assembleSiteContent()
  return json({ content })
}

export async function PUT(context: APIContext): Promise<Response> {
  let body: { content?: SiteContent }
  try {
    body = await context.request.json() as { content?: SiteContent }
  } catch {
    return error('invalid json')
  }
  if (!body?.content) return error('missing content')
  await replaceSiteContent(body.content)
  const content = await assembleSiteContent()
  return json({ content })
}
