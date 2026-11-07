export const prerender = false

import type { APIContext } from 'astro'
import { env } from 'cloudflare:workers'
import { json, error } from '../../../../../backend/lib/admin/api.ts'
import {
  listReleases,
  getCurrentRelease,
  getPreviousRelease,
  createRelease,
  activateRelease,
  updateReleaseStatus,
} from '../../../../../backend/lib/admin/db.ts'

function deployHook(): string {
  const hook = (env as unknown as Record<string, unknown>).DEPLOY_HOOK_URL
  return typeof hook === 'string' ? hook : ''
}

export async function GET(): Promise<Response> {
  const [releases, current, previous] = await Promise.all([
    listReleases(),
    getCurrentRelease(),
    getPreviousRelease(),
  ])

  return json({
    releases,
    current: current?.version ?? null,
    previous: previous?.version ?? null,
    canBuild: Boolean(deployHook()),
  })
}

export async function POST(context: APIContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return error('invalid json')
  }

  const action = String(body.action ?? '')

  if (action === 'build') {
    // Workers 内不能执行本地构建；通过 Cloudflare Deploy Hook 触发外部构建。
    const hook = deployHook()
    if (!hook) {
      return error('当前为直接上传部署：后台无法构建。请先在本地运行 npm run deploy 发布。', 501)
    }

    const version = `v${Date.now()}`
    await createRelease(version, 'admin')

    try {
      const response = await fetch(hook, { method: 'POST' })
      const log = await response.text()
      if (!response.ok) {
        await updateReleaseStatus(version, 'failed', log || `deploy hook responded ${response.status}`)
        return error(`build failed: deploy hook responded ${response.status}`, 502)
      }
      await updateReleaseStatus(version, 'success', log || 'deploy hook triggered')
      await activateRelease(version)
      return json({ ok: true, version, message: 'build and activate successful' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await updateReleaseStatus(version, 'failed', message)
      return error(`build failed: ${message}`, 502)
    }
  }

  return error('invalid action')
}
