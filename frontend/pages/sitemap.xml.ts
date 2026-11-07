import type { APIRoute } from 'astro';
import { site } from '../lib/site';
import { escapeXml } from '../lib/seo';
import { getPublishedPosts, getAllTags, tagHref, BLOG_PAGE_SIZE } from '../lib/posts';
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const paths = new Set<string>([...site.nav.map((item) => item.href), '/blog/']);
  for (const post of posts) paths.add(`/blog/${post.id}/`);
  for (let page = 2; page <= Math.ceil(posts.length / BLOG_PAGE_SIZE); page++) paths.add(`/blog/page/${page}/`);
  for (const { tag, count } of await getAllTags()) {
    const base = tagHref(tag);
    paths.add(base);
    for (let page = 2; page <= Math.ceil(count / BLOG_PAGE_SIZE); page++) paths.add(`${base}page/${page}/`);
  }
  const entries = [...paths].map((path) => `<url><loc>${escapeXml(new URL(path, site.url).href)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
