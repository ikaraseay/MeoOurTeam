import type { APIRoute } from 'astro';
import { site } from '../lib/site';
import { getPublishedPosts } from '../lib/posts';

const pageNotes: Record<string, string> = {
  '/': '站点首页，团队与研究方向概览。',
  '/members/': '团队成员、导师与研究方向介绍。',
  '/research/': '研究方向、技术优势与应用场景。',
  '/projects/': '科研项目、项目来源与关键词。',
  '/outcomes/': '学术论文、获奖证书与实验演示。',
  '/contact/': '招生、合作与申请指引。',
  '/news/': '团队新闻、学术公告与招生通知。',
  '/blog/': '团队博客文章列表。',
};

export const GET: APIRoute = async () => {
  const pages = site.nav.map(({ href, label }) => `- [${label}](${new URL(href, site.url).href}): ${pageNotes[href] ?? ''}`);
  const posts = (await getPublishedPosts()).map((post) => `- [${post.data.title}](${new URL(`/blog/${post.id}/`, site.url).href}): ${post.data.description}`);
  const body = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    '团队官方网站，语言模型可参考以下页面了解团队概况、研究方向、成员、项目、成果与动态。',
    '',
    ...pages,
    '',
    ...(posts.length > 0 ? ['## 博客文章', '', ...posts, ''] : []),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
