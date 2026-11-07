export const prerender = false

import type { APIContext } from 'astro'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import { listSettings, upsertSetting, deleteSetting } from '../../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const items = await listSettings()
  const settings: Record<string, string> = {}
  for (const item of items) {
    settings[item.key] = item.value
  }
  return json({ settings })
}

export async function PUT(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const updates = body.updates as Record<string, string> | undefined
  if (!updates || typeof updates !== 'object') {
    return error('missing updates')
  }

  for (const [key, value] of Object.entries(updates)) {
    await upsertSetting(key, String(value ?? ''))
  }

  return json({ ok: true })
}

export async function DELETE(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const keys = body.keys as string[] | undefined
  if (!Array.isArray(keys)) {
    return error('missing keys array')
  }

  for (const key of keys) {
    await deleteSetting(key)
  }

  return json({ ok: true })
}
