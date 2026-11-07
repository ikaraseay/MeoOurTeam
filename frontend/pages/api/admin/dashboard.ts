export const prerender = false

import type { APIContext } from 'astro'
import { json } from '../../../../backend/lib/admin/api.ts'
import { listMembers, listResearch, listProjects, listOutcomes, listAllNews, listMedia } from '../../../../backend/lib/admin/db.ts'

export async function GET(): Promise<Response> {
  const [members, research, projects, outcomes, news, media] = await Promise.all([
    listMembers(),
    listResearch(),
    listProjects(),
    listOutcomes(),
    listAllNews(),
    listMedia(),
  ])

  return json({
    stats: {
      members: members.length,
      research: research.length,
      projects: projects.length,
      outcomes: outcomes.length,
      news: news.length,
      media: media.length,
      publishedNews: news.filter(n => n.status === 'published').length,
      activeMembers: members.filter(m => m.is_active === 1).length,
    },
  })
}
