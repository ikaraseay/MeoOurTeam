/**
 * 发布管理 HTML 模板：提供版本信息、操作按钮、任务列表与日志容器。
 * 不执行发布；releases.js 调用接口，服务端 ReleaseManager 完成任务并提供状态。
 */
import { adminSidebar } from './admin-shell.mjs';
import { t } from './text-config.ts';
import { escapeText as h } from '../../server/public/text-validation.mjs';
export function releaseAdminPage() {
  const label = key => h(t(key));
  return `<div class="app-shell">${adminSidebar({ release: true, canManageCopy: true })}<main class="workspace">
    <header class="workspace-header"><h1>${label('release.title')}</h1><button id="release-refresh">${label('release.refresh')}</button></header>
    <p id="release-notice" role="status" aria-live="polite"></p>
    <section class="site-panel"><p>${label('release.current')}: <code id="release-current"></code></p><p>${label('release.previous')}: <code id="release-previous"></code></p>
    <div class="editor-actions"><button id="release-rollback" class="danger-outline">${label('release.rollback')}</button><button id="release-rebuild" class="secondary">${label('release.rebuild')}</button></div><p class="field-help">${label('release.rebuildHelp')}</p></section>
    <p id="release-status" role="status"></p><div id="release-jobs" class="list-panel"></div>
    <section class="site-panel"><h2>${label('release.buildLog')}</h2><pre id="release-log" class="release-log"></pre></section>
    <details class="site-panel"><summary>${label('release.history')}</summary><div id="release-history"></div></details>
    </main></div><script type="module" src="/admin/assets/releases.js"></script>`;
}
