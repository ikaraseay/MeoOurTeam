#!/usr/bin/env node
/**
 * 检查远端是否有更新 —— 提交前的守卫。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const MANIFEST = join(ROOT, 'frontend/content/generated/.manifest.json')

try {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const age = Date.now() - new Date(manifest.exported_at ?? 0).getTime()
  const hours = Math.round(age / (1000 * 60 * 60))
  if (hours > 24) {
    console.warn('[guard] 上次导出已超过 ' + hours + ' 小时，建议先跑 pnpm sync')
    process.exit(1)
  }
  console.log('[guard] 数据新鲜（' + hours + ' 小时前导出）')
} catch {
  console.warn('[guard] 没有找到导出清单，先跑 pnpm sync')
  process.exit(1)
}
