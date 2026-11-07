export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../backend/lib/admin/api.ts'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const { env } = await import('cloudflare:workers')
    const workerEnv = env as unknown as Record<string, unknown>
    
    const siteUrl = typeof workerEnv.SITE_URL === 'string' ? workerEnv.SITE_URL : ''
    if (!siteUrl) {
      return error('SITE_URL not configured', 500)
    }

    const triggerUrl = `${siteUrl}/api/trigger-export`
    const response = await fetch(triggerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ force: true }),
    })

    if (!response.ok) {
      const text = await response.text()
      return error(`export failed: ${text}`, 500)
    }

    return json({ ok: true, message: 'export triggered successfully' })
  } catch (err) {
    return error(`export error: ${err instanceof Error ? err.message : String(err)}`, 500)
  }
}
