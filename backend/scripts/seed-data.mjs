#!/usr/bin/env node
/**
 * 从 Team 项目的 JSON 数据生成 D1 种子 SQL
 *
 * 用法：
 *   node backend/scripts/seed-data.mjs                    # 输出到 stdout
 *   node backend/scripts/seed-data.mjs > seed.sql         # 保存到文件
 *   node backend/scripts/seed-data.mjs --apply            # 直接执行到远程 D1
 *   node backend/scripts/seed-data.mjs --apply --local    # 执行到本地 D1
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEAM_ROOT = resolve(__dirname, '../../frontend/lib');
const PROJECT_ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LOCAL = args.includes('--local');

function readJSON(path) {
  return JSON.parse(readFileSync(resolve(TEAM_ROOT, path), 'utf-8'));
}

function sqlEscape(str) {
  if (str == null) return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function generateId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// =============================================================================
// 读取源数据
// =============================================================================

const members = readJSON('team-profiles.json');
const research = readJSON('research-directions.json');
const projects = readJSON('projects.json');
const publications = readJSON('publication-details.json');

// =============================================================================
// 生成 SQL
// =============================================================================

const lines = [];
const ts = now();

lines.push('-- 种子数据：由 seed-data.mjs 自动生成');
lines.push(`-- 生成时间：${ts}`);
lines.push('');

// Members ---------------------------------------------------------------------
lines.push('-- 团队成员');
members.forEach((m, i) => {
  const id = generateId('member', i + 1);
  lines.push(`INSERT OR REPLACE INTO members (id, name, role, bio, avatar_key, email, homepage, sort_order, is_active, created_at) VALUES (
  ${sqlEscape(id)},
  ${sqlEscape(m.name)},
  ${sqlEscape(m.role)},
  ${sqlEscape(m.bio || '')},
  ${sqlEscape(m.photo || '')},
  ${sqlEscape(m.email || '')},
  ${sqlEscape(m.homepage || '')},
  ${i},
  1,
  ${sqlEscape(ts)}
);`);
});
lines.push('');

// Research Directions ---------------------------------------------------------
lines.push('-- 研究方向');
research.forEach((r, i) => {
  const id = r.id || generateId('research', i + 1);
  lines.push(`INSERT OR REPLACE INTO research_directions (id, title, content, icon, sort_order, is_active, created_at) VALUES (
  ${sqlEscape(id)},
  ${sqlEscape(r.title)},
  ${sqlEscape(r.content)},
  ${sqlEscape(r.image || '')},
  ${i},
  1,
  ${sqlEscape(ts)}
);`);
});
lines.push('');

// Projects --------------------------------------------------------------------
lines.push('-- 科研项目');
projects.forEach((p, i) => {
  const id = generateId('project', i + 1);
  const description = `${p.source}。关键词：${p.keywords.join('、')}`;
  lines.push(`INSERT OR REPLACE INTO projects (id, name, description, url, category, sort_order, is_active, created_at) VALUES (
  ${sqlEscape(id)},
  ${sqlEscape(p.title)},
  ${sqlEscape(description)},
  '',
  ${sqlEscape(p.source)},
  ${i},
  1,
  ${sqlEscape(ts)}
);`);
});
lines.push('');

// Outcomes (Papers) -----------------------------------------------------------
lines.push('-- 论文成果');
const paperPaths = Object.keys(publications);
paperPaths.forEach((path, i) => {
  const pub = publications[path];
  const id = generateId('paper', i + 1);
  const yearMatch = path.match(/\/(\d{4})-/);
  const year = yearMatch ? yearMatch[1] : '';
  const titleFromPath = path.split('/').pop().replace('.pdf', '').replace(/^\d{4}-/, '');
  const authors = pub.authors.split(/[,、]/).map(s => s.trim());

  lines.push(`INSERT OR REPLACE INTO outcomes (id, title, type, description, url, pdf_key, date, authors, tags, sort_order, is_active, created_at) VALUES (
  ${sqlEscape(id)},
  ${sqlEscape(titleFromPath)},
  'paper',
  ${sqlEscape(`${pub.venue}。作者：${pub.authors}`)},
  '',
  ${sqlEscape(path)},
  ${sqlEscape(year)},
  ${sqlEscape(JSON.stringify(authors))},
  ${sqlEscape(JSON.stringify([pub.venue, year]))},
  ${i},
  1,
  ${sqlEscape(ts)}
);`);
});
lines.push('');

// Outcomes (Competitions) -----------------------------------------------------
lines.push('-- 竞赛成果');
const competitions = [
  {
    id: 'award-example-1',
    title: '创新竞赛全国二等奖',
    description: '团队在智能应用赛道获一等奖，并获综合评比全国二等奖。',
    date: '2026-06-29',
    sourceUrl: 'https://example.com/news/',
  },
  {
    id: 'award-example-2',
    title: '创新竞赛全国三等奖',
    description: '团队在智能监测赛道获一等奖，并获综合评比全国三等奖。',
    date: '2026-06-29',
    sourceUrl: 'https://example.com/news/',
  },
];

competitions.forEach((c, i) => {
  lines.push(`INSERT OR REPLACE INTO outcomes (id, title, type, description, url, pdf_key, date, authors, tags, sort_order, is_active, created_at) VALUES (
  ${sqlEscape(c.id)},
  ${sqlEscape(c.title)},
  'award',
  ${sqlEscape(c.description)},
  ${sqlEscape(c.sourceUrl)},
  '',
  ${sqlEscape(c.date)},
  '[]',
  ${sqlEscape(JSON.stringify(['竞赛', '智慧农业', '2026']))},
  ${paperPaths.length + i},
  1,
  ${sqlEscape(ts)}
);`);
});
lines.push('');

// Settings (site defaults) ----------------------------------------------------
lines.push('-- 站点设置');
const settings = [
  ['site.name', '人工智能研究实验室'],
  ['site.professorEnglishName', 'Principal Investigator'],
  ['identity.university', '示例大学'],
  ['identity.institute', '人工智能研究院'],
  ['site.platform', '示例大学 · 人工智能学院'],
  ['site.address', '示例市示例区示例路 1 号'],
];

settings.forEach(([key, value]) => {
  lines.push(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (
  ${sqlEscape(key)},
  ${sqlEscape(value)},
  ${sqlEscape(ts)}
);`);
});
lines.push('');

lines.push('-- 完成');

const sql = lines.join('\n');

// =============================================================================
// 输出或执行
// =============================================================================

if (APPLY) {
  const tmpFile = resolve(PROJECT_ROOT, '.seed-tmp.sql');
  writeFileSync(tmpFile, sql);

  const configPath = resolve(PROJECT_ROOT, 'config.env');
  const configContent = readFileSync(configPath, 'utf-8');
  const dbNameMatch = configContent.match(/^D1_DATABASE_NAME=(.+)$/m);
  const dbName = dbNameMatch ? dbNameMatch[1].trim().replace(/['"]/g, '') : 'ourteam-content';

  const flag = LOCAL ? '--local' : '--remote';
  const cmd = `cd "${PROJECT_ROOT}/cloudflare" && ../node_modules/.bin/wrangler d1 execute ${dbName} ${flag} --file="${tmpFile}"`;

  console.error(`执行种子 SQL 到 ${LOCAL ? '本地' : '远程'} D1: ${dbName}`);
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.error(output);
    console.error('✓ 种子数据已导入');
  } catch (err) {
    console.error('✗ 导入失败:', err.stderr || err.message);
    process.exit(1);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
} else {
  process.stdout.write(sql);
}
