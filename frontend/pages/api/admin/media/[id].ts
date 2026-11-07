export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { deleteMedia, mediaBucket } from '../../../../../backend/lib/admin/db.ts'
import { env } from 'cloudflare:workers'

export async function GET(context: APIContext): Promise<Response> {
  const key = context.url.searchParams.get('key')
  if (!key) return error('missing key')

  const bucket = mediaBucket()
  const object = await bucket.get(key)
  if (!object) return error('not found', 404)

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

export async function DELETE(context: APIContext): Promise<Response> {
  const id = context.params.id
  if (!id) return error('missing id')

  const bucket = mediaBucket()
  const record = await env.DB.prepare('SELECT key FROM media WHERE id = ?').bind(id).first<{ key: string }>()
  if (record) {
    await bucket.delete(record.key)
  }

  await deleteMedia(id)
  return json({ ok: true })
}
