#!/usr/bin/env node
/**
 * 从 JSON 文件导入数据到 D1
 *
 * 用法：
 *   node scripts/import-data.mjs backup.json              # 导入到远程 D1
 *   node scripts/import-data.mjs backup.json --local      # 导入到本地 D1
 *   node scripts/import-data.mjs backup.json --dry-run    # 只生成 SQL 不执行
 *   node scripts/import-data.mjs backup.json --tables members,projects  # 只导入指定表
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const LOCAL = args.includes('--local');
const DRY_RUN = args.includes('--dry-run');
const tablesArg = args.find(a => a.startsWith('--tables='));
const filterTables = tablesArg ? tablesArg.split('=')[1].split(',') : null;

if (!filePath) {
  console.error('用法: node scripts/import-data.mjs <json-file> [--local] [--dry-run] [--tables=members,projects]');
  process.exit(1);
}

function getConfig() {
  const configPath = resolve(PROJECT_ROOT, 'config.env');
  const content = readFileSync(configPath, 'utf-8');
  const get = (key) => {
    const m = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return m ? m[1].trim().replace(/['"]/g, '') : '';
  };
  return { dbName: get('D1_DATABASE_NAME') };
}

function sqlEscape(str) {
  if (str == null) return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function generateInsertSQL(table, rows) {
  if (!rows || rows.length === 0) return '';

  const lines = [`-- ${table}: ${rows.length} 行`];

  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      return sqlEscape(v);
    });

    lines.push(`INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
  }

  return lines.join('\n');
}

// =============================================================================
// 读取 JSON 并生成 SQL
// =============================================================================

const data = JSON.parse(readFileSync(resolve(filePath), 'utf-8'));
const allTables = ['members', 'research_directions', 'projects', 'outcomes', 'news', 'documents', 'settings', 'media'];
const tablesToImport = filterTables || allTables;

const sqlParts = [];
sqlParts.push('-- 导入数据：由 import-data.mjs 生成');
sqlParts.push(`-- 导入时间：${new Date().toISOString()}`);
sqlParts.push('');

let totalRows = 0;
for (const table of tablesToImport) {
  if (!data[table]) {
    process.stderr.write(`跳过 ${table}（数据中不存在）\n`);
    continue;
  }
  const rows = data[table];
  sqlParts.push(generateInsertSQL(table, rows));
  sqlParts.push('');
  totalRows += rows.length;
  process.stderr.write(`${table}: ${rows.length} 行\n`);
}

const sql = sqlParts.join('\n');
process.stderr.write(`\n共 ${totalRows} 行\n`);

if (DRY_RUN) {
  process.stdout.write(sql);
  process.exit(0);
}

// =============================================================================
// 执行 SQL
// =============================================================================

const { dbName } = getConfig();
const tmpFile = resolve(PROJECT_ROOT, '.import-tmp.sql');
writeFileSync(tmpFile, sql);

const flag = LOCAL ? '--local' : '--remote';
const wrangler = resolve(PROJECT_ROOT, 'node_modules/.bin/wrangler');
const cmd = `cd "${PROJECT_ROOT}/cloudflare" && ${wrangler} d1 execute ${dbName} ${flag} --file="${tmpFile}"`;

process.stderr.write(`\n导入到 ${LOCAL ? '本地' : '远程'} D1: ${dbName}\n`);

try {
  const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  process.stderr.write(output);
  process.stderr.write('✓ 导入完成\n');
} catch (err) {
  process.stderr.write('✗ 导入失败: ' + (err.stderr || err.message) + '\n');
  process.exit(1);
} finally {
  try { unlinkSync(tmpFile); } catch {}
}
