/**
 * D1 查询 —— 三条路，输出形状一样（数组 of 行）。
 *   远端 + token ：Cloudflare REST API
 *   远端无 token ：借 wrangler 的登录态
 *   本地         ：wrangler 的 --local
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function readD1Config(wranglerConfig) {
  try {
    const config = readFileSync(wranglerConfig, 'utf8')
    return {
      id: config.match(/"database_id"\s*:\s*"([^"]+)"/)?.[1] ?? '',
      name: config.match(/"database_name"\s*:\s*"([^"]+)"/)?.[1] ?? '',
      binding: config.match(/"binding"\s*:\s*"([^"]+)"/)?.[1] ?? '',
    }
  } catch {
    return { id: '', name: '', binding: '' }
  }
}

function runWrangler(root, wranglerConfig, args) {
  const output = execFileSync(
    join(root, 'node_modules/.bin/wrangler'),
    ['d1', 'execute', ...args, '--json', '--config', wranglerConfig],
    { encoding: 'utf8', cwd: root },
  )
  const payload = JSON.parse(output)
  if (!payload[0]?.success) throw new Error('D1 查询失败：' + output)
  return payload[0].results ?? []
}

function queryLocal(root, wranglerConfig, name, sql) {
  return runWrangler(root, wranglerConfig, [name, '--local', '--command', sql])
}

function queryRemote(root, wranglerConfig, name, sql) {
  return runWrangler(root, wranglerConfig, [name, '--remote', '--command', sql])
}

async function queryRest({ accountId, databaseId, token }, sql) {
  const url =
    'https://api.cloudflare.com/client/v4/accounts/' +
    accountId +
    '/d1/database/' +
    databaseId +
    '/query'
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ sql }),
  })
  if (!response.ok) {
    throw new Error('D1 查询失败：' + response.status + ' ' + (await response.text()))
  }
  const payload = await response.json()
  if (!payload.success) {
    throw new Error('D1 查询失败：' + JSON.stringify(payload.errors ?? payload))
  }
  return payload.result?.[0]?.results ?? []
}

export function createQuery(options) {
  const { root, wranglerConfig, useLocal = false, token, accountId, databaseId } = options
  const name = readD1Config(wranglerConfig).name || 'ourteam-content'
  return async function query(sql) {
    if (useLocal) return queryLocal(root, wranglerConfig, name, sql)
    if (!token || !accountId) return queryRemote(root, wranglerConfig, name, sql)
    return queryRest({ accountId, databaseId, token }, sql)
  }
}
