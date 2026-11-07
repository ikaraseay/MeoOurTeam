/**
 * 站点资料的共同数据契约：默认记录、读取、规范化与字段校验。
 * 后台保存和发布快照再次校验均使用本模块；公开页面也读取规范化后的已发布资料。
 * 缺失字段兼容旧数据并补默认值，显式空数组保持为空；资料记录优先于种子内容。
 * 成果文件与预览可选，论文全文是否公开由授权/链接配置控制，不能由上传动作推断。
 */
import { createHash } from 'node:crypto';
import { runtimeDirectory, publishedSourceDirectory } from './data-paths.mjs';
import { t } from './text-config.ts';
import { videoPoster } from './media.mjs';
import { publicationHighlights } from './publications.ts';
import { outcomePreview } from './outcome-previews.mjs';
import researchDefaults from './research-directions.json' with { type: 'json' };
import { academicMemberGroups, splitLegacyMemberGroups } from './member-groups.mjs';

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const managedContentDefaults = Object.freeze({
  // Absent fields in older installations receive these defaults; [] stays empty.
  projects: [],
  researchDirections: researchDefaults,
  homepage: { researchDirections: false, researchHighlights: false, latestNews: false, joinTeam: false },
  peopleGroups: [
    { id: 'pi', title: 'PI 负责人', people: [] },
    { id: 'advisors', title: '学术顾问', people: [] },
    { id: 'faculty', title: '专任教师', people: [] },
    ...academicMemberGroups(),
    { id: 'alumni', title: '往届毕业生', people: [] },
  ],
  publications: [],
  introductionVideos: [],
  outcomeFiles: [],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stringField(value, label, max, { required = true } = {}) {
  if (typeof value !== 'string') throw new Error(t("errors.text037", {p0: label}));
  const clean = value.trim();
  if (clean.includes('\0') || clean.length > max || (required && clean.length === 0)) throw new Error(t("errors.text038", {p0: label, p1: required ? '1' : '0', p2: max}));
  return clean;
}

function pathOrUrl(value, label, { required = false } = {}) {
  const clean = stringField(value ?? '', label, 500, { required });
  if (!required && (clean === 'undefined' || clean === 'null')) return '';
  if (!clean) return '';
  if (clean.startsWith('/')) {
    if (clean.startsWith('//') || /[\s<>"']/.test(clean)) throw new Error(t("errors.managed001", {p0: label}));
    return clean;
  }
  try {
    const url = new URL(clean);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    return url.href;
  } catch {
    throw new Error(t("errors.managed002", {p0: label}));
  }
}

function emailField(value = '') {
  const clean = stringField(value, t('admin.memberEmail'), 254, { required: false });
  if (clean && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean)) throw new Error(t('admin.invalidMemberEmail'));
  return clean;
}

function booleanField(value, label, fallback = false) {
  const resolved = value === undefined ? fallback : value;
  if (typeof resolved !== 'boolean') throw new Error(t('admin.invalidVisibility', { p0: label }));
  return resolved;
}

function list(value, label, max) {
  if (!Array.isArray(value) || value.length > max) throw new Error(t("errors.managed003", {p0: label}));
  return value;
}

function person(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed004", {p0: index + 1}));
  if (input.id !== undefined && (typeof input.id !== 'string' || !/^member-[a-z0-9-]{1,80}$/.test(input.id))) throw new Error(t('release.invalidMemberId'));
  return {
    ...(input.id ? { id: input.id } : {}),
    name: stringField(input.name, t("errors.managed005"), 80),
    role: stringField(input.role, t("errors.managed006"), 100),
    focus: stringField(input.focus, t("errors.managed007"), 240),
    email: emailField(input.email),
    homepage: pathOrUrl(input.homepage ?? '', t("errors.managed008")),
    photo: pathOrUrl(input.photo ?? '', t("errors.managed009")),
    // Render as text, never HTML; legacy records can omit the biography.
    bio: stringField(input.bio ?? '', t("admin.memberBio"), 4000, { required: false }),
  };
}

function peopleGroup(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed010", {p0: index + 1}));
  return {
    id: stringField(input.id || `group-${index + 1}`, t("errors.managed011"), 60).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    title: stringField(input.title, t("errors.managed012"), 80),
    people: list(input.people ?? [], t("admin.label067"), 80).map(person),
  };
}

// Legacy records are intentionally unconfirmed; file presence is not authorization.
/** @returns {import('./publications.ts').PublicationRights} */
function publicationRights(value = 'pending') {
  if (!['pending', 'allowed', 'restricted'].includes(value)) throw new Error(t('admin.invalidPaperRights'));
  return /** @type {import('./publications.ts').PublicationRights} */ (value);
}
function officialUrl(value = '') {
  const clean = pathOrUrl(value, t('admin.paperOfficial'));
  if (!clean) return '';
  if (!/^https?:\/\//.test(clean)) throw new Error(t('admin.officialAbsolute'));
  const url = new URL(clean);
  if (url.username || url.password) throw new Error(t('admin.officialAbsolute'));
  return clean;
}
function checkedHighlights(value = []) {
  if (!Array.isArray(value) || value.length > 4 || value.some((v) => !publicationHighlights.includes(v))) throw new Error(t('admin.invalidPaperHighlights'));
  return publicationHighlights.filter((v) => value.includes(v));
}

function publication(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed013", {p0: index + 1}));
  const highlights = checkedHighlights(input.highlights);
  const visible = booleanField(input.visible, t('admin.paperVisibility'));
  if (visible && !highlights.includes('cas-q1')) throw new Error(t('admin.paperQ1Required'));
  return {
    year: stringField(input.year, t("errors.managed014"), 20),
    title: stringField(input.title, t("errors.managed015"), 240),
    venue: stringField(input.venue, t("errors.managed016"), 160),
    area: stringField(input.area, t("errors.managed017"), 80),
    file: pathOrUrl(input.file ?? '', t("errors.managed018")),
    authors: stringField(input.authors ?? '', t('admin.paperAuthors'), 1400, { required: false }),
    citation: stringField(input.citation ?? '', t('admin.paperCitation'), 3000, { required: false }),
    rights: publicationRights(input.rights),
    officialUrl: officialUrl(input.officialUrl),
    highlights,
    visible,
    thumbnail: pathOrUrl(input.thumbnail ?? '', t('admin.paperThumbnail')),
  };
}

function video(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed019", {p0: index + 1}));
  return {
    title: stringField(input.title, t("errors.managed020"), 160),
    focus: stringField(input.focus, t("errors.managed021"), 120),
    file: pathOrUrl(input.file, t("admin.text115"), { required: true }),
    poster: pathOrUrl(input.poster ?? videoPoster(input.file), t("admin.videoPoster")),
  };
}

function outcomeFile(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed022", {p0: index + 1}));
  // Outcome metadata is independent of optional attachments. Older editors used
  // /uploads/ as an empty-file placeholder; migrate it to an actual empty value.
  const suppliedFile = pathOrUrl(input.file, t("errors.managed026"));
  const file = suppliedFile === '/uploads/' ? '' : suppliedFile;
  return {
    year: stringField(input.year, t("errors.managed023"), 20),
    title: stringField(input.title, t("errors.managed024"), 180),
    level: stringField(input.level, t("errors.managed025"), 120),
    file,
    preview: pathOrUrl(input.preview || (file ? outcomePreview(file) : ''), t("admin.outcomePreview")),
    visible: booleanField(input.visible, t('admin.outcomeVisibility')),
    pdfVisible: booleanField(input.pdfVisible === undefined ? Boolean(file) : input.pdfVisible, t('admin.outcomePdfVisibility')),
  };
}

function project(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t('admin.invalidProject'));
  if (!Number.isInteger(input.startYear) || input.startYear < 1900 || input.startYear > 2100) throw new Error(t('admin.invalidProjectYear'));
  const plain = (value, label, max) => {
    const clean = stringField(value, label, max);
    if (/[<>]/.test(clean)) throw new Error(t('admin.projectPlainText'));
    return clean;
  };
  return {
    startYear: input.startYear,
    title: plain(input.title, t('admin.projectTitle'), 240),
    source: plain(input.source, t('admin.projectSource'), 160),
    keywords: list(input.keywords ?? [], t('admin.projectKeywords'), 20).map((word) => plain(word, t('admin.projectKeywords'), 80)),
  };
}

function researchDirection(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t('admin.invalidResearch'));
  // Stable, prefixed anchors avoid collisions with page navigation and survive edits.
  if (typeof input.id !== 'string' || input.id.length > 80 || !/^direction-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) throw new Error(t('admin.invalidResearchId'));
  const plain = (value, label, max, required = true) => {
    const clean = stringField(value, label, max, { required });
    if (/[<>]/.test(clean)) throw new Error(t('admin.researchPlainText'));
    return clean;
  };
  return {
    id: input.id,
    title: plain(input.title, t('admin.researchTitle'), 160),
    content: plain(input.content, t('admin.researchContent'), 2000),
    advantage: plain(input.advantage ?? '', t('admin.researchAdvantage'), 1000, false),
    scene: plain(input.scene ?? '', t('admin.researchScene'), 1000, false),
    image: pathOrUrl(input.image ?? '', t('admin.researchImage')),
    imageCaption: plain(input.imageCaption ?? '', t('admin.researchCaption'), 240, false),
  };
}

function researchList(input) {
  const items = list(input, t('admin.research'), 50).map(researchDirection);
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(t('admin.invalidResearchId'));
  return items;
}

function homepageSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t('admin.invalidHomepage'));
  return Object.fromEntries(Object.entries(managedContentDefaults.homepage).map(([key, fallback]) => {
    const value = input[key] === undefined ? fallback : input[key];
    if (typeof value !== 'boolean') throw new Error(t('admin.invalidHomepage'));
    return [key, value];
  }));
}

export function normalizeManagedContent(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(t("errors.managed027"));
  const source = { ...managedContentDefaults, ...input };
  const groups = list(splitLegacyMemberGroups(list(source.peopleGroups, t('errors.managed028'), 23).map(peopleGroup)), t('errors.managed028'), 23);
  const ids = new Set();
  const groupIds = new Set();
  for (const group of groups) {
    if (groupIds.has(group.id)) throw new Error(t('release.invalidMemberId'));
    groupIds.add(group.id);
    group.people.forEach((member, index) => {
      member.id ||= 'member-' + createHash('sha256').update(`${group.id}:${index}:${member.name}`).digest('hex').slice(0, 24);
      if (ids.has(member.id)) throw new Error(t('release.invalidMemberId'));
      ids.add(member.id);
    });
  }
  return {
    projects: list(source.projects, t('admin.projects'), 200).map(project),
    researchDirections: researchList(source.researchDirections),
    homepage: homepageSettings(source.homepage),
    peopleGroups: groups,
    publications: list(source.publications, t("outcomes.text012"), 200).map(publication),
    introductionVideos: list(source.introductionVideos, t("admin.text041"), 100).map(video),
    outcomeFiles: list(source.outcomeFiles, t("admin.text042"), 120).map(outcomeFile),
  };
}

export function managedContentPath(env = process.env) {
  return resolve(env.BLOG_SITE_CONTENT_FILE ?? join(publishedSourceDirectory(env) ?? runtimeDirectory(env), 'site-content.json'));
}

export function readManagedContent(path = managedContentPath()) {
  if (!existsSync(path)) return normalizeManagedContent(clone(managedContentDefaults));
  return normalizeManagedContent(JSON.parse(readFileSync(path, 'utf8')));
}

export const managedContent = readManagedContent();
