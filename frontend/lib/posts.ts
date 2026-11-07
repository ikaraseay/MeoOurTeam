/**
 * Shared blog-post query helpers.
 *
 * The "fetch non-draft posts sorted newest-first" logic was repeated
 * in LatestPosts.astro, blog/index.astro, blog/[slug].astro, and
 * rss.xml.ts. Centralized here so sort order and the draft filter
 * stay consistent everywhere.
 */
import { newsCategoryIds } from "./news";
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export const BLOG_PAGE_SIZE = 6;
export type BlogPost = CollectionEntry<"blog">;

/** All published (non-draft) posts, newest first. */
export async function getPublishedPosts() {
  return (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** The newest N published posts, for the homepage preview. */
export async function getRecentPosts(n: number) {
  return (await getPublishedPosts()).slice(0, n);
}

export function paginatePosts(posts: BlogPost[], page: number) {
  const totalPages = Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE));
  if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;
  return { posts: posts.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE), page, totalPages };
}

export async function getAllTags() {
  const counts = new Map<string, number>();
  for (const post of await getPublishedPosts()) {
    for (const tag of new Set(post.data.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag, "zh-CN"));
}

export async function getPostsByTag(tag: string) {
  return (await getPublishedPosts()).filter((post) => post.data.tags.includes(tag));
}

export const tagHref = (tag: string) => `/blog/tag/${encodeURIComponent(tag)}/`;

/** News surfaces share the same published/tagged subset. */
export async function getNewsPosts(category?: string) {
  return (await getPublishedPosts()).filter((post) => {
    const categories = newsCategoryIds(post.data.tags);
    return category ? categories.includes(category) : categories.length > 0;
  });
}
