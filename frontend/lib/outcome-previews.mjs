/** Bundled outcome previews; add a slug here when shipping a matching preview image. */
const bundled = new Set([]);
export function outcomePreview(file) {
  const slug = /^\/research\/awards\/([^/]+)\.pdf$/.exec(file)?.[1];
  if (slug && bundled.has(slug)) return `/images/outcome-previews/${slug}.jpg`;
  return /^\/[^/].*\.(?:png|jpe?g|webp)$/i.test(file ?? '') ? file : '';
}
