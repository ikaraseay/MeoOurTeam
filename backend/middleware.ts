/**
 * 后台鉴权 —— 一处拦截，别每个路由各写一遍。
 * 覆盖 /admin/*（页面）与 /api/admin/*（接口）。
 */

import { defineMiddleware } from 'astro:middleware'
import { SESSION_COOKIE, verifySession } from './lib/admin/session.ts'
import { bodyTooLarge, MAX_BODY_BYTES, MAX_UPLOAD_BYTES } from './lib/admin/api.ts'

const ADMIN_PAGE = /^\/admin(\/|$)/
const ADMIN_API = /^\/api\/admin(\/|$)/
const MEDIA_API = /^\/api\/admin\/media(\/|$)/

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname

  const tooLarge = bodyTooLarge(
    context.request,
    MEDIA_API.test(path) ? MAX_UPLOAD_BYTES : MAX_BODY_BYTES,
  )
  if (tooLarge) return tooLarge

  const isApi = ADMIN_API.test(path)
  const isPage = ADMIN_PAGE.test(path)
  if (!isApi && !isPage) return next()

  if (path.endsWith('/admin/login') || path === '/api/admin/login') return next()

  const { env } = await import('cloudflare:workers')
  const token = context.cookies.get(SESSION_COOKIE)?.value
  const secret = (env as unknown as Record<string, unknown>).SESSION_SECRET
  if (typeof secret === 'string' && (await verifySession(token, secret))) return next()

  if (isApi) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }

  return context.redirect('/admin/login')
})
