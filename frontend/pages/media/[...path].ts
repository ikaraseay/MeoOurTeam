export const prerender = false

import type { APIRoute } from 'astro'

/**
 * 公开媒体路由：从 R2（MEDIA binding）按 key 提供媒体文件。
 * 媒体通过后台"媒体库"上传或由数据导入脚本写入，不进入 Git 仓库。
 */
export const GET: APIRoute = async ({ params }) => {
  const raw = params.path ?? ''
  let key: string
  try {
    key = decodeURIComponent(raw)
  } catch {
    return new Response('Not found', { status: 404 })
  }
  if (!key || key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    return new Response('Not found', { status: 404 })
  }

  const { env } = await import('cloudflare:workers')
  const bucket = (env as unknown as Record<string, unknown>).MEDIA as R2Bucket
  const object = await bucket.get(key)
  if (!object) return new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'content-length': String(object.size),
      etag: object.httpEtag,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
