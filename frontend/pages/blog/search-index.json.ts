import type { APIRoute } from "astro";
import { getPublishedPosts } from "../../lib/posts";

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  return new Response(JSON.stringify(posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    href: `/blog/${post.id}/`,
  }))), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
