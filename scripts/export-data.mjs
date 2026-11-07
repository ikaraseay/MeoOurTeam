#!/usr/bin/env node
/**
 * 从 D1 导出全部数据为 JSON
 *
 * 用法：
 *   node scripts/export-data.mjs                    # 输出到 stdout
 *   node scripts/export-data.mjs > backup.json      # 保存到文件
 *   node scripts/export-data.mjs --local            # 从本地 D1 导出
 *   node scripts/export-data.mjs --pretty           # 格式化输出
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const LOCAL = args.includes('--local');
const PRETTY = args.includes('--pretty');

function getConfig() {
  const configPath = resolve(PROJECT_ROOT, 'config.env');
  const content = readFileSync(configPath, 'utf-8');
  const get = (key) => {
    const m = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return m ? m[1].trim().replace(/['"]/g, '') : '';
  };
  return { dbName: get('D1_DATABASE_NAME') };
}

function queryD1(sql) {
  const { dbName } = getConfig();
  const flag = LOCAL ? '--local' : '--remote';
  const wrangler = resolve(PROJECT_ROOT, 'node_modules/.bin/wrangler');
  const cmd = `cd "${PROJECT_ROOT}/cloudflare" && ${wrangler} d1 execute ${dbName} ${flag} --command=${JSON.stringify(sql)} --json`;

  try {
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(output);
  } catch (err) {
    console.error('查询失败:', err.stderr || err.message);
    process.exit(1);
  }
}

function extractRows(result) {
  if (Array.isArray(result) && result[0]?.results) return result[0].results;
  if (result?.results) return result.results;
  return [];
}

// =============================================================================
// 导出各表
// =============================================================================

const tables = [
  { name: 'members', sql: 'SELECT * FROM members ORDER BY sort_order' },
  { name: 'research_directions', sql: 'SELECT * FROM research_directions ORDER BY sort_order' },
  { name: 'projects', sql: 'SELECT * FROM projects ORDER BY sort_order' },
  { name: 'outcomes', sql: 'SELECT * FROM outcomes ORDER BY sort_order' },
  { name: 'news', sql: 'SELECT * FROM news ORDER BY pub_date DESC' },
  { name: 'documents', sql: 'SELECT * FROM documents ORDER BY created_at DESC' },
  { name: 'settings', sql: 'SELECT * FROM settings' },
  { name: 'media', sql: 'SELECT * FROM media ORDER BY created_at DESC' },
];

const exportData = {
  _meta: {
    exportedAt: new Date().toISOString(),
    source: LOCAL ? 'local' : 'remote',
  },
};

for (const table of tables) {
  process.stderr.write(`导出 ${table.name}... `);
  const result = queryD1(table.sql);
  const rows = extractRows(result);
  exportData[table.name] = rows;
  process.stderr.write(`${rows.length} 行\n`);
}

const json = PRETTY ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
process.stdout.write(json);
