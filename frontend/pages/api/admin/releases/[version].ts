export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { getRelease, getPreviousRelease, activateRelease } from '../../../../../backend/lib/admin/db.ts'

export async function GET(context: APIContext): Promise<Response> {
  const version = context.params.version
  
  if (version === 'previous') {
    const previous = await getPreviousRelease()
    if (!previous) {
      return error('no previous release', 404)
    }
    return json({ release: previous })
  }
  
  if (!version) {
    return error('missing version')
  }
  
  const release = await getRelease(version)
  if (!release) {
    return error('not found', 404)
  }
  
  return json({ release })
}

export async function POST(context: APIContext): Promise<Response> {
  const version = context.params.version
  if (!version) {
    return error('missing version')
  }
  
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }
  
  const action = String(body.action ?? '')
  
  if (action === 'rollback') {
    const previous = await getPreviousRelease()
    if (!previous) {
      return error('no previous release to rollback to', 404)
    }
    
    await activateRelease(previous.version)
    return json({ ok: true, version: previous.version, message: 'rollback successful' })
  }
  
  if (action === 'activate') {
    const release = await getRelease(version)
    if (!release) {
      return error('release not found', 404)
    }
    
    await activateRelease(version)
    return json({ ok: true, message: 'activation successful' })
  }
  
  return error('invalid action')
}
