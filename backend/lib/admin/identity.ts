/**
 * 站点品牌图标 —— 单条 JSON 设置，构建时导出为 data/runtime/site-identity.json。
 */

import { listSettings, upsertSetting } from './db.ts'
import {
  DEFAULT_SITE_IDENTITY,
  normalizeSiteIdentity,
  type SiteIdentity,
} from '../../../frontend/lib/site-identity.ts'

const SITE_IDENTITY_KEY = 'site_identity'

export async function readSiteIdentity(): Promise<SiteIdentity> {
  const settings = await listSettings()
  const stored = settings.find((item) => item.key === SITE_IDENTITY_KEY)?.value
  if (!stored) return normalizeSiteIdentity({})
  try {
    return normalizeSiteIdentity(JSON.parse(stored))
  } catch {
    return normalizeSiteIdentity({})
  }
}

export async function writeSiteIdentity(input: unknown): Promise<SiteIdentity> {
  const identity = normalizeSiteIdentity(input)
  await upsertSetting(SITE_IDENTITY_KEY, JSON.stringify(identity))
  return identity
}

export { DEFAULT_SITE_IDENTITY }
