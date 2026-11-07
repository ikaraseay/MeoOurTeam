/**
 * Date formatting helpers shared across the site.
 * Previously each component defined its own `fmt` with slightly
 * different options — centralized here to keep dates consistent.
 */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
