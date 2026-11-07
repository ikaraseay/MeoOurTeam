#!/usr/bin/env node
/**
 * 把 config.env 里的真值铺回配置文件。
 * 仓库里 wrangler.jsonc 与 astro.config.mjs 放的是占位符，
 * 真值在 config.env —— 构建前由这个脚本填回去。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_ENV = join(ROOT, 'config.env')
const WRANGLER = join(ROOT, 'cloudflare/wrangler.jsonc')
const ASTRO = join(ROOT, 'astro.config.mjs')

function loadEnv() {
  const values = {}
  try {
    for (const line of readFileSync(CONFIG_ENV, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      values[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {
    // 没有 config.env
  }
  for (const key of ['SITE_URL', 'D1_DATABASE_ID', 'D1_DATABASE_NAME', 'R2_BUCKET_NAME', 'WORKER_NAME']) {
    if (!values[key] && process.env[key]) values[key] = process.env[key]
  }
  return values
}

const env = loadEnv()
const host = (env.SITE_URL ?? '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')

function patch(file, edits) {
  let source = readFileSync(file, 'utf8')
  let changed = false
  for (const [pattern, value] of edits) {
    if (!value) continue
    const next = source.replace(pattern, value)
    if (next !== source) {
      source = next
      changed = true
    }
  }
  if (changed) writeFileSync(file, source, 'utf8')
  return changed
}

const wranglerEdits = []
if (env.WORKER_NAME) wranglerEdits.push([/"name":\s*"[^"]*"/, `"name": "${env.WORKER_NAME}"`])
if (env.D1_DATABASE_ID) wranglerEdits.push([/"database_id":\s*"[^"]*"/, `"database_id": "${env.D1_DATABASE_ID}"`])
if (env.D1_DATABASE_NAME) wranglerEdits.push([/"database_name":\s*"[^"]*"/, `"database_name": "${env.D1_DATABASE_NAME}"`])
if (env.R2_BUCKET_NAME) wranglerEdits.push([/"bucket_name":\s*"[^"]*"/, `"bucket_name": "${env.R2_BUCKET_NAME}"`])
if (host) wranglerEdits.push([/"pattern":\s*"[^"]*"/, `"pattern": "${host}"`])
patch(WRANGLER, wranglerEdits)

const astroEdits = []
if (env.SITE_URL) astroEdits.push([/(site:\s*')[^']*(')/, `$1${env.SITE_URL}$2`])
patch(ASTRO, astroEdits)

console.log('[apply] 配置已应用')
