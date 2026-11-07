export const prerender = false

import type { APIContext } from 'astro'
import { env } from 'cloudflare:workers'
import { json } from '../../../../../backend/lib/admin/api.ts'
import bundledLocations from '../../../../../data/runtime/text-locations.json' with { type: 'json' }

/** 位置索引由 build-text-locations.mjs 在构建后写入静态资产。 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    const asset = await env.ASSETS.fetch(new Request(new URL('/text-locations.json', context.url)))
    if (asset.ok) {
      const text = await asset.text()
      if (text.trim()) {
        return new Response(text, {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      }
    }
  } catch {
    // 本地开发未启用 ASSETS 时使用构建期快照
  }
  return json(bundledLocations)
}
