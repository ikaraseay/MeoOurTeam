/** Publication policy shared by every public surface; absent rights never grants access. */
import { t, type TextKey } from './text-config.ts';
export const publicationHighlights = ['cas-q1', 'ccf-a', 'highly-cited', 'hot'] as const;
export type PublicationHighlight = typeof publicationHighlights[number];
export type PublicationRights = 'pending' | 'allowed' | 'restricted';
export interface Publication {
  year: string; title: string; venue: string; area: string; file: string;
  authors?: string; citation?: string; rights?: PublicationRights;
  officialUrl?: string; highlights?: PublicationHighlight[]; thumbnail?: string; visible?: boolean;
}
const highlightKeys: Record<PublicationHighlight, TextKey> = {
  'cas-q1': 'publications.casQ1', 'ccf-a': 'publications.ccfA',
  'highly-cited': 'publications.highlyCited', hot: 'publications.hot',
};
export function orderedHighlights(paper: Publication): PublicationHighlight[] {
  return publicationHighlights.filter((value) => paper.highlights?.includes(value));
}
export function highlightLabel(value: PublicationHighlight): string { return t(highlightKeys[value]); }
function safeLink(value: string | undefined, externalOnly = false): string {
  if (!value || /[\s<>"'\\\u0000-\u001f]/.test(value)) return '';
  if (!externalOnly && value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function publicationLink(paper: Publication): { href: string; official: boolean } | null {
  if (paper.rights !== 'allowed') return null;
  const official = safeLink(paper.officialUrl, true);
  if (official) return { href: official, official: true };
  const local = safeLink(paper.file);
  // A legacy remote file remains supported, but is not automatically an official source.
  return local ? { href: local, official: false } : null;
}
export function publicationCitation(paper: Publication): string {
  return paper.citation?.trim() || [paper.authors, paper.title, paper.venue, paper.year].filter(Boolean).join('. ') + '.';
}
export function sortPublications(papers: Publication[]): Publication[] {
  const rank = (p: Publication) => publicationHighlights.findIndex((h) => p.highlights?.includes(h));
  return [...papers].sort((a, b) => (rank(a) < 0 ? 4 : rank(a)) - (rank(b) < 0 ? 4 : rank(b)) || b.year.localeCompare(a.year, undefined, { numeric: true }));
}
