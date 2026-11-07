/**
 * 服务端与构建端共用的数据路径规则，集中处理环境变量及正式 data 目录。
 * 独立构建优先读取 current.json 指向的已发布 source；没有运行数据时使用仓库种子内容。
 * 发布子进程显式指定快照路径，避免误读工作区或构建期间变化的在线指针。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fallback for prerender context where import.meta.url may be undefined
const currentDir = typeof import.meta.url === 'string' 
  ? dirname(fileURLToPath(import.meta.url))
  : process.cwd();
export const projectRoot = resolve(currentDir, '../..');
export const permanentDataRoot = join(projectRoot, 'data');
export function runtimeDirectory(env = process.env) {
  return resolve(env.BLOG_DATA_DIR || join(permanentDataRoot, 'runtime'));
}
export function blogDirectory(env = process.env) {
  return resolve(env.BLOG_CONTENT_DIR || join(permanentDataRoot, 'content/blog'));
}
// Standalone builds use the committed snapshot too; admin writes remain in its workspace.
export function publishedSourceDirectory(env = process.env) {
  const runtime = runtimeDirectory(env);
  const pointer = join(runtime, 'current.json');
  if (!existsSync(pointer)) return null;
  const { current } = JSON.parse(readFileSync(pointer, 'utf8'));
  if (typeof current !== 'string' || !/^[a-f0-9-]{36}$/.test(current)) throw new Error('Invalid published version');
  return join(runtime, 'releases', current, 'source');
}
// A fresh checkout can build the bundled seed without initializing runtime data.
export function buildBlogDirectory(env = process.env) {
  if (!env.BLOG_CONTENT_DIR) { const published = publishedSourceDirectory(env); if (published) return join(published, 'blog'); }
  const directory = blogDirectory(env);
  return env.BLOG_CONTENT_DIR || existsSync(directory) ? directory : join(projectRoot, 'src/content/blog');
}
export function textResourceFile(env = process.env) {
  return resolve(env.BLOG_TEXT_FILE || join(publishedSourceDirectory(env) ?? runtimeDirectory(env), 'text-resources.json'));
}
