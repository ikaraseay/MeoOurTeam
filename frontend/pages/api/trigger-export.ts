export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../backend/lib/admin/api.ts'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const { env } = await import('cloudflare:workers')
    const workerEnv = env as unknown as Record<string, unknown>
    
    const exportFn = workerEnv.EXPORT_DATA
    if (typeof exportFn !== 'function') {
      return error('export function not available', 500)
    }

    await exportFn()
    return json({ ok: true, message: 'export completed' })
  } catch (err) {
    return error(`export failed: ${err instanceof Error ? err.message : String(err)}`, 500)
  }
}
