/**
 * API 工具函数 —— 请求体大小检查、JSON 响应。
 */

export const MAX_BODY_BYTES = 64 * 1024
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function bodyTooLarge(request: Request, limit: number): Response | null {
  const length = request.headers.get('content-length')
  if (length && Number(length) > limit) {
    return new Response(JSON.stringify({ error: 'payload too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  return null
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function randomId(): string {
  return crypto.randomUUID()
}
