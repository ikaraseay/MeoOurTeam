/**
 * 站点资料整体读写 —— 对齐原后台的 site-content 模型。
 * 读取时把 D1 各表组装成前端使用的 JSON 结构；保存时整体写回。
 */

import { env } from 'cloudflare:workers'
import {
  listMembers,
  listResearch,
  listProjects,
  listOutcomes,
  listSettings,
  upsertSetting,
  type MemberRecord,
  type OutcomeRecord,
} from './db.ts'

export interface PersonItem {
  id: string
  name: string
  role: string
  focus: string
  email: string
  homepage: string
  photo: string
  bio: string
}

export interface PeopleGroup {
  id: string
  title: string
  people: PersonItem[]
}

export interface ResearchItem {
  id: string
  title: string
  content: string
  advantage: string
  scene: string
  image: string
  imageCaption: string
}

export interface ProjectItem {
  startYear: number
  title: string
  source: string
  keywords: string[]
}

export interface PublicationItem {
  year: string
  title: string
  venue: string
  area: string
  file: string
  authors: string
  visible: boolean
  rights: string
  highlights: string[]
  officialUrl: string
  thumbnail: string
  citation: string
}

export interface OutcomeItem {
  year: string
  title: string
  level: string
  file: string
  visible: boolean
  pdfVisible: boolean
  preview: string
}

export interface VideoItem {
  title: string
  focus: string
  file: string
  poster: string
}

export interface HomepageConfig {
  researchDirections: boolean
  researchHighlights: boolean
  latestNews: boolean
  joinTeam: boolean
}

export interface SiteContent {
  peopleGroups: PeopleGroup[]
  researchDirections: ResearchItem[]
  projects: ProjectItem[]
  publications: PublicationItem[]
  outcomeFiles: OutcomeItem[]
  introductionVideos: VideoItem[]
  homepage: HomepageConfig
}

const DEFAULT_HOMEPAGE: HomepageConfig = {
  researchDirections: true,
  researchHighlights: true,
  latestNews: true,
  joinTeam: true,
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function groupMembers(members: MemberRecord[]): PeopleGroup[] {
  const buckets: Record<string, MemberRecord[]> = {
    pi: [],
    faculty: [],
    postdocs: [],
    phd: [],
    masters: [],
    other: [],
  }
  for (const member of members) {
    const role = (member.role || '').toLowerCase()
    if (role.includes('教授') && !role.includes('副')) buckets.pi.push(member)
    else if (role.includes('副教授') || role.includes('教师') || role.includes('讲师')) buckets.faculty.push(member)
    else if (role.includes('博士后')) buckets.postdocs.push(member)
    else if (role.includes('博士')) buckets.phd.push(member)
    else if (role.includes('硕士')) buckets.masters.push(member)
    else buckets.other.push(member)
  }
  const titles: Array<[string, string]> = [
    ['pi', 'PI 负责人'],
    ['faculty', '专任教师'],
    ['postdocs', '博士后'],
    ['phd', '博士生'],
    ['masters', '硕士生'],
    ['other', '其他成员'],
  ]
  return titles
    .filter(([key]) => buckets[key].length > 0)
    .map(([key, title]) => ({
      id: key,
      title,
      people: buckets[key].map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        focus: member.bio?.split('\n')[0] || '',
        email: member.email || '',
        homepage: member.homepage || '',
        photo: member.avatar_key || '',
        bio: member.bio || '',
      })),
    }))
}

function projectFromRecord(record: { name: string; description: string; category: string }): ProjectItem {
  const match = record.description?.match(/关键词：(.+)$/)
  const keywords = match ? match[1].split('、') : []
  const sourceMatch = record.description?.match(/^(.+?)。关键词/)
  return {
    startYear: new Date().getFullYear(),
    title: record.name,
    source: sourceMatch ? sourceMatch[1] : record.category || '',
    keywords,
  }
}

function publicationFromRecord(record: OutcomeRecord): PublicationItem {
  const tags = safeJsonParse<string[]>(record.tags, [])
  return {
    year: record.date || '',
    title: record.title,
    venue: tags[0] || '',
    area: '',
    file: record.pdf_key || '',
    authors: safeJsonParse<string[]>(record.authors, []).join(', '),
    visible: record.is_active === 1,
    rights: 'allowed',
    highlights: [],
    officialUrl: record.url || '',
    thumbnail: '',
    citation: record.description || '',
  }
}

function outcomeFromRecord(record: OutcomeRecord): OutcomeItem {
  return {
    year: record.date?.slice(0, 4) || '',
    title: record.title,
    level: '',
    file: '',
    visible: record.is_active === 1,
    pdfVisible: false,
    preview: record.url || '',
  }
}

const SITE_CONTENT_KEY = 'site_content'

function normalizeSiteContent(content: Partial<SiteContent>): SiteContent {
  const peopleGroups = (content.peopleGroups ?? []).map((group, groupIndex) => ({
    id: group.id || `group-${groupIndex + 1}`,
    title: group.title ?? '',
    people: (group.people ?? []).map((person, personIndex) => ({
      ...person,
      id: person.id || `member-${groupIndex + 1}-${personIndex + 1}`,
    })),
  }))
  return {
    peopleGroups,
    researchDirections: content.researchDirections ?? [],
    projects: content.projects ?? [],
    publications: content.publications ?? [],
    outcomeFiles: content.outcomeFiles ?? [],
    introductionVideos: content.introductionVideos ?? [],
    homepage: { ...DEFAULT_HOMEPAGE, ...(content.homepage ?? {}) },
  }
}

export async function assembleSiteContent(): Promise<SiteContent> {
  const [members, research, projects, outcomes, settings] = await Promise.all([
    listMembers(),
    listResearch(),
    listProjects(),
    listOutcomes(),
    listSettings(),
  ])

  const settingsMap = Object.fromEntries(settings.map((item) => [item.key, item.value]))
  const stored = safeJsonParse<Partial<SiteContent> | null>(settingsMap[SITE_CONTENT_KEY], null)
  if (stored && (stored.peopleGroups?.length || stored.publications?.length || stored.projects?.length || stored.researchDirections?.length || stored.outcomeFiles?.length || stored.introductionVideos?.length)) {
    return normalizeSiteContent(stored)
  }

  const homepage = safeJsonParse<HomepageConfig>(settingsMap.homepage, DEFAULT_HOMEPAGE)

  return {
    peopleGroups: groupMembers(members.filter((member) => member.is_active === 1)),
    researchDirections: research
      .filter((item) => item.is_active === 1)
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        advantage: '',
        scene: '',
        image: item.icon || '',
        imageCaption: '',
      })),
    projects: projects.filter((item) => item.is_active === 1).map(projectFromRecord),
    publications: outcomes.filter((item) => item.type === 'paper' && item.is_active === 1).map(publicationFromRecord),
    outcomeFiles: outcomes.filter((item) => item.type !== 'paper' && item.is_active === 1).map(outcomeFromRecord),
    introductionVideos: [],
    homepage,
  }
}

function memberId(person: PersonItem, index: number): string {
  return person.id || `member-${index + 1}`
}

export async function replaceSiteContent(input: SiteContent): Promise<void> {
  const content = normalizeSiteContent(input)
  // 完整草稿以 JSON 保存在 settings，保证论文标签、视频、分组顺序等编辑器字段不会在表结构映射中丢失。
  await upsertSetting(SITE_CONTENT_KEY, JSON.stringify(content))
  const now = new Date().toISOString()
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM members'),
    env.DB.prepare('DELETE FROM research_directions'),
    env.DB.prepare('DELETE FROM projects'),
    env.DB.prepare('DELETE FROM outcomes'),
  ]

  let memberOrder = 0
  for (const group of content.peopleGroups ?? []) {
    for (const [index, person] of (group.people ?? []).entries()) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO members (id, name, role, bio, avatar_key, email, homepage, sort_order, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        ).bind(
          memberId(person, memberOrder),
          person.name ?? '',
          person.role ?? '',
          person.bio || person.focus || '',
          person.photo || '',
          person.email || '',
          person.homepage || '',
          memberOrder++,
          now,
        ),
      )
      void index
    }
  }

  for (const [index, item] of (content.researchDirections ?? []).entries()) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO research_directions (id, title, content, icon, sort_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      ).bind(item.id || `direction-${index + 1}`, item.title ?? '', item.content ?? '', item.image || '', index, now),
    )
  }

  for (const [index, item] of (content.projects ?? []).entries()) {
    const description = `${item.source ?? ''}。关键词：${(item.keywords ?? []).join('、')}`
    statements.push(
      env.DB.prepare(
        `INSERT INTO projects (id, name, description, url, category, sort_order, is_active, created_at)
         VALUES (?, ?, ?, '', ?, ?, 1, ?)`,
      ).bind(`project-${index + 1}`, item.title ?? '', description, item.source ?? '', index, now),
    )
  }

  for (const [index, item] of (content.publications ?? []).entries()) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO outcomes (id, title, type, description, url, pdf_key, date, authors, tags, sort_order, is_active, created_at)
         VALUES (?, ?, 'paper', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        `paper-${index + 1}`,
        item.title ?? '',
        item.citation ?? '',
        item.officialUrl || '',
        item.file || '',
        item.year || '',
        JSON.stringify((item.authors || '').split(', ').filter(Boolean)),
        JSON.stringify(item.venue ? [item.venue] : []),
        index,
        item.visible === false ? 0 : 1,
        now,
      ),
    )
  }

  for (const [index, item] of (content.outcomeFiles ?? []).entries()) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO outcomes (id, title, type, description, url, pdf_key, date, authors, tags, sort_order, is_active, created_at)
         VALUES (?, ?, 'award', '', ?, '', ?, '[]', '[]', ?, ?, ?)`,
      ).bind(
        `award-${index + 1}`,
        item.title ?? '',
        item.preview || '',
        item.year || '',
        content.publications.length + index,
        item.visible === false ? 0 : 1,
        now,
      ),
    )
  }

  await env.DB.batch(statements)
  await upsertSetting('homepage', JSON.stringify(content.homepage ?? DEFAULT_HOMEPAGE))
}
