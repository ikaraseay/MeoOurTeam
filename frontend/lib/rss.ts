import type { RSSFeedItem } from "@astrojs/rss";
import type { BlogPost } from "./posts";

export const rssNamespaces = {
  atom: "http://www.w3.org/2005/Atom",
  dc: "http://purl.org/dc/elements/1.1/",
} as const;

/** Escape administrator-authored text before inserting it into RSS custom XML. */
export function escapeRssXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

/** RSS 2.0's author element expects an email address. Use Dublin Core for names. */
export function rssItemFromPost(post: BlogPost): RSSFeedItem {
  return {
    title: post.data.title,
    pubDate: post.data.pubDate,
    description: post.data.description,
    link: `/blog/${post.id}/`,
    categories: post.data.tags,
    customData: `<dc:creator>${escapeRssXml(post.data.author)}</dc:creator>`,
  };
}

export function rssChannelData(siteUrl: string, language: string, latest?: Date): string {
  const self = new URL("/rss.xml", siteUrl).href;
  return [
    `<language>${escapeRssXml(language)}</language>`,
    `<atom:link href="${escapeRssXml(self)}" rel="self" type="application/rss+xml" />`,
    latest ? `<lastBuildDate>${latest.toUTCString()}</lastBuildDate>` : "",
  ].filter(Boolean).join("");
}
