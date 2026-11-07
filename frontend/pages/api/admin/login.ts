export const prerender = false

import type { APIContext } from 'astro'
import { error } from '../../../../backend/lib/admin/api.ts'
import { verifyPassword, isRateLimited } from '../../../../backend/lib/admin/password.ts'
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '../../../../backend/lib/admin/session.ts'
import { getLoginAttempt, recordLoginFailure, clearLoginAttempts, secret, clientIp } from '../../../../backend/lib/admin/db.ts'

export async function POST(context: APIContext): Promise<Response> {
  const ip = clientIp(context.request)
  const attempt = await getLoginAttempt(ip)
  if (isRateLimited(attempt.count, new Date(attempt.window_at).getTime())) {
    return error('too many attempts, try later', 429)
  }

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const password = typeof body.password === 'string' ? body.password : ''
  const expectedHash = secret('ADMIN_PASSWORD_HASH')
  const sessionSecret = secret('SESSION_SECRET')
  if (!expectedHash || !sessionSecret) {
    return error('服务端登录凭据未配置完整：请设置 ADMIN_PASSWORD_HASH 和 SESSION_SECRET。', 500)
  }

  if (!password || !(await verifyPassword(password, expectedHash))) {
    await recordLoginFailure(ip)
    return error('invalid credentials', 401)
  }

  await clearLoginAttempts(ip)
  const token = await signSession({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }, sessionSecret)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`,
    },
  })
}
