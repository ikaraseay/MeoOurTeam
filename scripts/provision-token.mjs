#!/usr/bin/env node
/**
 * 用一次性引导 Token 生成最小权限运行时 Token
 *
 *   CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token
 *   CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token --full
 *
 * 引导 Token 必须是用户级 Token，并带 User → API Tokens → Edit；
 * 它只用于创建一次新 Token，完成后应立即删除。
 *
 * 为什么不是账户级 Token：
 * Cloudflare Workers Builds API 只接受用户级 Token（账户级会返回 Invalid token）。
 * 所以这里生成的是最小权限的「用户级」Token，一个 Token 覆盖部署、D1 与构建配置。
 *
 * Token 明文只写入 gitignored 的 config.env，不会打印到日志。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_FILE = join(ROOT, 'config.env')
const API = 'https://api.cloudflare.com/client/v4'
const FULL = process.argv.includes('--full')
const DAYS_ARG = process.argv.indexOf('--days')
const DAYS = DAYS_ARG > -1 ? Number(process.argv[DAYS_ARG + 1]) : 0
const NAME_ARG = process.argv.indexOf('--name')
const TOKEN_NAME = NAME_ARG > -1
  ? process.argv[NAME_ARG + 1]
  : `ourteam ${FULL ? 'full' : 'runtime'}`

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`用法：
  CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token
  CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token --full
  CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token --days 365

  token        部署 + Workers Builds + 构建期 D1 读取（最小权限）
  --full       额外包含 D1 写入与 R2 管理（init-db / seed / import）
  --days N     可选过期天数，默认不过期

引导 Token 权限（My Profile → API Tokens → 策略资源类型选 User）：
  User → API Tokens → Edit（用户 → API 令牌 → 编辑）
只需要这一项：读取权限组和创建 Token 都用它。
Account API tokens 页面没有 User 类别，找不到这些权限是正常的。
如果引导 Token 本身没有目标权限，Cloudflare 可能拒绝创建；此时给引导 Token 临时加上目标权限。`)
  process.exit(0)
}

function step(title) {
  console.log(`\n▸ ${title}`)
}
function ok(message) {
  console.log(`  ✓ ${message}`)
}
function info(message) {
  console.log(`  ${message}`)
}
function fail(message) {
  console.error(`  ✗ ${message}`)
  process.exit(1)
}

function readConfig() {
  let source = ''
  try {
    source = readFileSync(CONFIG_FILE, 'utf8')
  } catch {
    fail('缺少 config.env，先执行 cp config.env.example config.env')
  }
  const values = {}
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

function setConfig(key, value) {
  let source = readFileSync(CONFIG_FILE, 'utf8')
  const line = `${key}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  source = pattern.test(source)
    ? source.replace(pattern, line)
    : `${source.trimEnd()}\n${line}\n`
  writeFileSync(CONFIG_FILE, source)
}

const config = readConfig()
const accountId = config.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || ''
const bootstrap = process.env.CLOUDFLARE_BOOTSTRAP_TOKEN || ''

if (!accountId) fail('config.env 缺少 CLOUDFLARE_ACCOUNT_ID')
if (!bootstrap) fail('缺少引导 Token：CLOUDFLARE_BOOTSTRAP_TOKEN=xxx bash scripts/ops.sh token')
if (DAYS_ARG > -1 && (!Number.isInteger(DAYS) || DAYS <= 0)) fail('--days 需要正整数')

async function api(method, path, body, token = bootstrap) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.success) {
    const details = payload?.errors?.map((item) => item.message).join('; ') || `HTTP ${response.status}`
    throw new Error(`${method} ${path} → ${details}`)
  }
  return payload.result
}

async function verifyUserToken(token, label) {
  const response = await fetch(`${API}/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    fail([
      `${label}不是可用的用户级 Token。`,
      '账户级 Token（cfat_ 开头）不能用于 Workers Builds。',
      '请在 My Profile → API Tokens 创建用户级 Token。',
    ].join('\n  '))
  }
}

// 权限组名可能是 "D1:Edit"、"D1 Edit" 或旧版的 "D1"，统一去掉标点后比较。
function normalize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function groupScopes(group) {
  const raw = group.scopes ?? group.meta?.scopes
  if (Array.isArray(raw)) return raw
  return raw ? [raw] : []
}

function findGroup(groups, bases, level, scope) {
  const aliases = Array.isArray(bases) ? bases : [bases]
  const names = [...new Set(aliases.flatMap((base) => [
    `${normalize(base)} ${level}`,
    normalize(base),
  ]))]
  for (const name of names) {
    const exact = groups.filter((item) => normalize(item.name) === name)
    const scoped = exact.find((item) => {
      const scopes = groupScopes(item)
      return scopes.length === 0 || scopes.includes(scope)
    })
    if (scoped) return scoped
  }
  // 部分账号返回的 scope 元数据格式不同，名称唯一时直接使用。
  for (const name of names) {
    const exact = groups.find((item) => normalize(item.name) === name)
    if (exact) return exact
  }
  return null
}

function pickGroups(groups, wanted, scope) {
  const picked = []
  for (const [bases, level] of wanted) {
    const group = findGroup(groups, bases, level, scope)
    if (!group) {
      const aliases = Array.isArray(bases) ? bases : [bases]
      const candidates = groups
        .filter((item) => aliases.some((base) => normalize(item.name).includes(normalize(base))))
        .map((item) => item.name)
      fail([
        `找不到权限组：${aliases.join(' / ')}（${level}）`,
        candidates.length ? `相近权限组：${candidates.join('、')}` : '请确认引导 Token 有 User → API Tokens → Edit。',
      ].join('\n  '))
    }
    picked.push(group)
  }
  return [...new Map(picked.map((item) => [item.id, item])).values()]
}

async function main() {
  step('校验引导 Token')
  await verifyUserToken(bootstrap, '引导 Token')
  ok('引导 Token 是用户级 Token')

  step('读取权限组')
  // 只授予账户级权限；不需要 User Details / Memberships。
  const groups = await api('GET', '/user/tokens/permission_groups')

  const basePermissions = [
    ['Workers Scripts', 'edit'],
    // 新面板叫 Workers CI；旧文档/旧账号里可能仍显示 Workers Builds Configuration。
    [['Workers CI', 'Workers Builds Configuration'], 'edit'],
    ['Account Settings', 'read'],
    ['D1', 'read'],
  ]
  const fullPermissions = FULL
    ? [['D1', 'edit'], ['Workers R2 Storage', 'edit']]
    : []

  const accountGroups = pickGroups(groups, [...basePermissions, ...fullPermissions], 'com.cloudflare.api.account')
  ok(`账户权限：${accountGroups.map((item) => item.name).join('、')}`)

  step('创建最小权限 Token')
  const body = {
    name: TOKEN_NAME,
    policies: [
      {
        effect: 'allow',
        resources: { [`com.cloudflare.api.account.${accountId}`]: '*' },
        permission_groups: accountGroups.map((item) => ({ id: item.id })),
      },
    ],
  }
  if (DAYS > 0) {
    body.expires_on = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000).toISOString()
  }

  const created = await api('POST', '/user/tokens', body)
  if (!created?.value) fail('Token 创建成功但没有返回明文，请在 Dashboard 重新创建')
  ok(`Token 已创建：${created.name}（${created.id}）`)

  step('验证新 Token')
  await verifyUserToken(created.value, '新 Token')
  const buildTokens = await api('GET', `/accounts/${accountId}/builds/tokens`, undefined, created.value)
  ok(`新 Token 可访问 Workers Builds（${buildTokens.length} 个 Build Token）`)

  setConfig('CLOUDFLARE_API_TOKEN', created.value)
  ok('新 Token 已写入 config.env（已隐藏）')
  info('请立即到 My Profile → API Tokens 删除用于引导的临时 Token。')
  if (DAYS > 0) info(`新 Token 将在 ${body.expires_on} 过期。`)
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
