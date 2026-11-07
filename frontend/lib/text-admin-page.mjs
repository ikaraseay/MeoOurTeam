/**
 * 文案管理 HTML 模板：提供列表、编辑表单及审计容器；交互交给 copy-admin.js。
 * 返回模板前的访问权限由服务端入口验证，动态内容展示遵循文案绑定与转义规则。
 */
import { adminSidebar } from './admin-shell.mjs';
import { t } from './text-config.ts';
import { escapeText as h } from '../../server/public/text-validation.mjs';
/** Management UI contains keys, not independently maintained copy. */
export function textAdminPage() {
  const label = key => h(t(key));
  return `<div class="app-shell">${adminSidebar({ copy: true, canManageCopy: true })}<main class="workspace copy-workspace">
    <header class="workspace-header"><div><p class="eyebrow">${label('admin.text007')}</p><h1>${label('copy.title')}</h1></div><button id="copy-new" type="button">${label('copy.add')}</button></header>
    <div class="editor-actions"><button id="copy-publish" type="button">${label('release.publish')}</button><a href="/admin/releases">${label('release.title')}</a></div><p id="copy-notice" role="status" aria-live="polite"></p>
    <div class="admin-help"><p>${label('copy.intro')}</p></div>
    <div class="site-toolbar"><input id="copy-search" type="search" aria-label="${label('copy.search')}" placeholder="${label('copy.search')}"><select id="copy-module" aria-label="${label('copy.allModules')}"></select><button id="copy-reload" type="button" class="secondary">${label('copy.reload')}</button></div>
    <div class="site-manager copy-manager"><section class="site-list-panel copy-list-panel" aria-label="${label('copy.title')}"><p id="copy-results" class="field-help copy-list-heading" aria-live="polite"></p><div id="copy-list" class="site-list copy-list"></div><div id="copy-pagination" class="editor-actions copy-pagination"></div></section>
    <section class="site-detail-panel copy-detail-panel"><div id="copy-empty" class="empty-state">${label('admin.text045')}</div>
    <form id="copy-form" class="copy-form" hidden><div class="detail-heading"><h2 id="copy-heading"></h2></div><label for="copy-key">${label('copy.key')}</label><input id="copy-key" required maxlength="100" pattern="[a-z][a-z0-9]*([._-][a-zA-Z0-9]+)+"><p class="field-help">${label('copy.customHint')}</p><label for="copy-value">${label('copy.value')}</label><textarea id="copy-value" required maxlength="4000" rows="7"></textarea><p class="field-help">${label('copy.placeholders')}</p><details id="copy-default"><summary>${label('copy.defaultValue')}</summary><pre id="copy-default-value"></pre></details><div class="editor-actions"><button type="submit">${label('copy.save')}</button><button id="copy-cancel" type="button" class="secondary">${label('copy.cancel')}</button><button id="copy-delete" type="button" class="danger-outline">${label('copy.delete')}</button></div><p class="field-help">${label('copy.help')}</p></form></section></div>
    <details class="site-panel copy-audit"><summary>${label('copy.audit')}</summary><div id="copy-audit-list"></div></details>
  </main></div><script type="module" src="/admin/assets/copy-admin.js"></script>`;
}
