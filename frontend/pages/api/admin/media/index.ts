export const prerender = false

import type { APIContext } from 'astro'
import { json, error, randomId } from '../../../../../backend/lib/admin/api.ts'
import { listMedia, createMedia, deleteMedia, mediaBucket } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const items = await listMedia()
  return json({ media: items })
}

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData()
  const file = formData.get('file') as File | null
  const alt = formData.get('alt') as string || ''

  if (!file || !(file instanceof File)) {
    return error('missing file')
  }

  const bucket = mediaBucket()
  const id = randomId()
  const ext = file.name.split('.').pop() || 'bin'
  const key = `uploads/${id}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  })

  await createMedia({
    id,
    key,
    filename: file.name,
    mime: file.type,
    size: file.size,
    alt,
    created_at: new Date().toISOString(),
  })

  return json({ id, key, url: `/media/${key}` }, 201)
}
