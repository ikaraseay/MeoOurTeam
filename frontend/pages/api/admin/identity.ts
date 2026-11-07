export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../backend/lib/admin/api.ts'
import { readSiteIdentity, writeSiteIdentity } from '../../../../backend/lib/admin/identity.ts'

export async function GET(): Promise<Response> {
  return json({ identity: await readSiteIdentity() })
}

export async function PUT(context: APIContext): Promise<Response> {
  let body: { identity?: unknown }
  try {
    body = await context.request.json() as { identity?: unknown }
  } catch {
    return error('invalid json')
  }
  if (!body?.identity || typeof body.identity !== 'object') return error('missing identity')
  const identity = await writeSiteIdentity(body.identity)
  return json({ identity })
}
