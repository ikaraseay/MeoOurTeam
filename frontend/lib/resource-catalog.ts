import type { Publication, MediaDemo, AwardProof } from './research-materials';
import { publicationLink, orderedHighlights, highlightLabel } from './publications.ts';
export interface Resource { type: 'paper' | 'video' | 'pdf'; title: string; description: string; year: string; file: string; poster?: string }
/** Adapt managed records once; never duplicate their contents in page templates. */
export function createResources(data: { publications: Publication[]; demos: MediaDemo[]; awardProofs: AwardProof[] }): Resource[] {
  return [
    ...data.publications.map((p): Resource => ({ type: 'paper', title: p.title, description: [p.authors, p.area, p.venue, p.citation, ...orderedHighlights(p).map(highlightLabel)].filter(Boolean).join(' · '), year: p.year, file: publicationLink(p)?.href ?? '' })),
    ...data.demos.map((v): Resource => ({ type: 'video', title: v.title, description: v.focus, year: '', file: v.file, poster: v.poster })),
    ...data.awardProofs.map((a): Resource => ({ type: 'pdf', title: a.title, description: a.level, year: a.year, file: a.pdfVisible === false ? '' : a.file })),
  ];
}
