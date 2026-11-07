/**
 * 构建期文案输入：读取选定快照的覆盖值，校验并解码后交给 HTML/浏览器脚本构建。
 * 不写源码；后台修改要先发布并重建，已生成的公开网页才会更新。
 */
import { existsSync, readFileSync } from 'node:fs';
import { textResourceFile } from './data-paths.mjs';
import { validTextKey, validTextValue, decodeText } from '../../server/public/text-validation.mjs';

/** Build-only input: inject one immutable copy snapshot into HTML and browser JS. */
export function readBuildText(env = process.env) {
  const path = textResourceFile(env);
  if (!existsSync(path)) return {};
  const state = JSON.parse(readFileSync(path, 'utf8'));
  if (state.version !== 1 || !Number.isSafeInteger(state.revision) || !state.entries || Array.isArray(state.entries)) throw new Error('Invalid text build input');
  return Object.fromEntries(Object.entries(state.entries).map(([key, encoded]) => {
    if (!validTextKey(key) || typeof encoded !== 'string' || !validTextValue(decodeText(encoded))) throw new Error('Invalid text build entry');
    return [key, decodeText(encoded)];
  }));
}
