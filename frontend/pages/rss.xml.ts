import rss from "@astrojs/rss";
import { getPublishedPosts } from "../lib/posts";
import { rssChannelData, rssItemFromPost, rssNamespaces } from "../lib/rss";
import { site } from "../lib/site";

export async function GET() {
  const posts = await getPublishedPosts();
  return rss({
    title: site.rss.title,
    description: site.rss.description,
    site: site.url,
    xmlns: rssNamespaces,
    items: posts.map(rssItemFromPost),
    customData: rssChannelData(site.url, site.language, posts[0]?.data.pubDate),
  });
}
