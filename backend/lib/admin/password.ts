/**
 * 口令与登录限流 —— 纯函数。
 * 口令不存明文：Worker secret 里放的是它的 SHA-256，比对时现算现比。
 */

export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_WINDOW_MS = 10 * 60 * 1000

export async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return false
  return timingSafeEqual(await hashPassword(password), expectedHash.trim().toLowerCase())
}

export function isRateLimited(
  count: number,
  windowAt: number,
  now: number = Date.now(),
): boolean {
  if (count < LOGIN_MAX_ATTEMPTS) return false
  return now - windowAt < LOGIN_WINDOW_MS
}
