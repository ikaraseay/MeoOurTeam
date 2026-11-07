export const prerender = false

import type { APIContext } from 'astro'
import { json } from '../../../../backend/lib/admin/api.ts'
import { SESSION_COOKIE } from '../../../../backend/lib/admin/session.ts'

export async function POST(context: APIContext): Promise<Response> {
  const response = json({ ok: true })
  response.headers.append(
    'set-cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  )
  return response
}
