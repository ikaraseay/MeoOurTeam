import type { APIRoute } from 'astro';
import { site } from '../lib/site';
/** Crawling guidance only: admin access is still protected by server auth. */
export const GET: APIRoute = () => new Response([
  'User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/',
  `Sitemap: ${new URL('/sitemap.xml', site.url).href}`, '',
].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
