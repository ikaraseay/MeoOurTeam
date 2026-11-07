/**
 * 共享后台导航 HTML 模板，供主编辑器、文案页和发布页复用。
 * 参数只决定展示与链接结构，不能替代 index.mjs 的路由/API 权限检查。
 */
import { site } from './site.ts';
import { t } from './text-config.ts';
import { escapeText as h } from '../../server/public/text-validation.mjs';

/** Shared navigation for the editor and its separately authorized copy page. */
export function adminSidebar({ copy = false, release = false, canManageCopy = false } = {}) {
  const item = (view, key) => (copy || release)
    ? `<a href="/admin?view=${view}">${h(t(key))}</a>`
    : `<button id="nav-${view}" class="${view === 'posts' ? 'nav-active' : ''}" type="button">${h(t(key))}</button>`;
  return `<aside class="sidebar"><a class="brand" href="/admin">${h(site.name)}<small>${h(t('admin.text001'))}</small></a>
    <nav aria-label="${h(t('admin.arialabel050'))}">
      ${item('posts', 'admin.text002')}${item('media', 'admin.text003')}
      ${canManageCopy ? `<a href="/admin/texts"${copy ? ' class="nav-active" aria-current="page"' : ''}>${h(t('copy.title'))}</a>` : ''}
      ${item('site', 'admin.text004')}
      ${canManageCopy ? `<a href="/admin/releases"${release ? ' class="nav-active" aria-current="page"' : ''}>${h(t('release.title'))}</a>` : ''}
      <a href="/" target="_blank" rel="noopener noreferrer">${h(t('admin.text005'))}</a>
    </nav><button id="logout" class="logout" type="button">${h(t('admin.text006'))}</button></aside>`;
}
