#!/usr/bin/env node
/**
 * 从 Team 项目数据生成 import-data.mjs 兼容的 JSON 种子文件
 *
 * 用法：
 *   node backend/scripts/generate-seed-json.mjs                    # 输出到 backend/db/seeds/seed.json
 *   node backend/scripts/generate-seed-json.mjs --stdout           # 输出到 stdout
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEAM_ROOT = resolve(__dirname, '../../frontend/lib');
const SEEDS_DIR = resolve(__dirname, '../db/seeds');

const STDOUT = process.argv.includes('--stdout');

function readJSON(path) {
  return JSON.parse(readFileSync(resolve(TEAM_ROOT, path), 'utf-8'));
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

const ts = now();

// =============================================================================
// 构建 JSON
// =============================================================================

const seed = {
  _meta: {
    generatedAt: new Date().toISOString(),
    source: 'Team project local data',
  },

  members: members.map((m, i) => ({
    id: generateId('member', i + 1),
    name: m.name,
    role: m.role,
    bio: m.bio || '',
    avatar_key: m.photo || '',
    email: m.email || '',
    homepage: m.homepage || '',
    sort_order: i,
    is_active: 1,
    created_at: ts,
  })),

  research_directions: research.map((r, i) => ({
    id: r.id || generateId('research', i + 1),
    title: r.title,
    content: r.content,
    icon: r.image || '',
    sort_order: i,
    is_active: 1,
    created_at: ts,
  })),

  projects: projects.map((p, i) => ({
    id: generateId('project', i + 1),
    name: p.title,
    description: `${p.source}。关键词：${p.keywords.join('、')}`,
    url: '',
    category: p.source,
    sort_order: i,
    is_active: 1,
    created_at: ts,
  })),

  outcomes: [
    ...Object.entries(publications).map(([path, pub], i) => {
      const yearMatch = path.match(/\/(\d{4})-/);
      const year = yearMatch ? yearMatch[1] : '';
      const titleFromPath = path.split('/').pop().replace('.pdf', '').replace(/^\d{4}-/, '');
      const authors = pub.authors.split(/[,、]/).map(s => s.trim());
      return {
        id: generateId('paper', i + 1),
        title: titleFromPath,
        type: 'paper',
        description: `${pub.venue}。作者：${pub.authors}`,
        url: '',
        pdf_key: path,
        date: year,
        authors: JSON.stringify(authors),
        tags: JSON.stringify([pub.venue, year]),
        sort_order: i,
        is_active: 1,
        created_at: ts,
      };
    }),
    {
      id: 'award-example-1',
      title: '创新竞赛全国二等奖',
      type: 'award',
      description: '团队在智能应用赛道获一等奖，并获综合评比全国二等奖。',
      url: 'https://example.com/news/',
      pdf_key: '',
      date: '2026-06-29',
      authors: '[]',
      tags: JSON.stringify(['竞赛', '2026']),
      sort_order: Object.keys(publications).length,
      is_active: 1,
      created_at: ts,
    },
    {
      id: 'award-example-2',
      title: '创新竞赛全国三等奖',
      type: 'award',
      description: '团队在智能监测赛道获一等奖，并获综合评比全国三等奖。',
      url: 'https://example.com/news/',
      pdf_key: '',
      date: '2026-06-29',
      authors: '[]',
      tags: JSON.stringify(['竞赛', '2026']),
      sort_order: Object.keys(publications).length + 1,
      is_active: 1,
      created_at: ts,
    },
  ],

  settings: [
    { key: 'site.name', value: '人工智能研究实验室', updated_at: ts },
    { key: 'site.professorEnglishName', value: 'Principal Investigator', updated_at: ts },
    { key: 'identity.university', value: '示例大学', updated_at: ts },
    { key: 'identity.institute', value: '人工智能研究院', updated_at: ts },
    { key: 'site.platform', value: '示例大学 · 人工智能学院', updated_at: ts },
    { key: 'site.address', value: '示例市示例区示例路 1 号', updated_at: ts },
  ],

  news: [],
  documents: [],
  media: [],
};

// =============================================================================
// 输出
// =============================================================================

const json = JSON.stringify(seed, null, 2);

if (STDOUT) {
  process.stdout.write(json);
} else {
  mkdirSync(SEEDS_DIR, { recursive: true });
  const outPath = resolve(SEEDS_DIR, 'seed.json');
  writeFileSync(outPath, json);

  const counts = Object.entries(seed)
    .filter(([k]) => k !== '_meta')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : 0}`)
    .join(', ');

  console.error(`✓ 已生成 ${outPath}`);
  console.error(`  ${counts}`);
}
