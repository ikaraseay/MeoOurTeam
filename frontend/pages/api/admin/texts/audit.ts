export const prerender = false

import type { APIContext } from 'astro'
import { json } from '../../../../../backend/lib/admin/api.ts'
import { listTextAudit } from '../../../../../backend/lib/admin/db.ts'

export async function GET(context: APIContext): Promise<Response> {
  const limit = Number(context.url.searchParams.get('limit') || 100)
  const audit = await listTextAudit(limit)
  return json({ audit })
}
