#!/usr/bin/env node
/**
 * 清除构建期生成的文件。
 */
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const targets = [
  join(ROOT, 'frontend/data/overrides.ts'),
  join(ROOT, 'frontend/data/members-data.ts'),
  join(ROOT, 'frontend/data/research-data.ts'),
  join(ROOT, 'frontend/data/projects-data.ts'),
  join(ROOT, 'frontend/data/outcomes-data.ts'),
  join(ROOT, 'frontend/data/news-data.ts'),
  join(ROOT, 'frontend/content/generated'),
]

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
    console.log('[clean] 已删除：' + target)
  }
}

console.log('[clean] 完成')
