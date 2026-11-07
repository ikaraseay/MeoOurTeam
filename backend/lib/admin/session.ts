/**
 * 会话 —— 单管理员的签名 Cookie。
 * 口令与密钥都在 Worker secret 里，Cookie 里只有签名过的载荷。
 */

export const SESSION_COOKIE = 'ourteam_session'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export interface SessionPayload {
  exp: number
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error('SESSION_SECRET 未配置，无法签名会话')
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return body + '.' + toBase64Url(new Uint8Array(signature))
}

export async function verifySession(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [body, signature] = parts

  const key = await hmacKey(secret)
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
  )

  let given: Uint8Array
  try {
    given = fromBase64Url(signature)
  } catch {
    return false
  }
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i]
  if (diff !== 0) return false

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    return typeof payload.exp === 'number' && payload.exp * 1000 > now
  } catch {
    return false
  }
}
