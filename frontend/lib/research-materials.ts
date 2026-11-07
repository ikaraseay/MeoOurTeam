import { managedContent } from "./managed-content.mjs";

import type { Publication } from './publications';
export type { Publication } from './publications';
export interface ProjectBrief {
  startYear: number;
  title: string;
  source: string;
  keywords: string[];
}

export interface MediaDemo {
  title: string;
  focus: string;
  file: string;
  poster?: string;
}

export interface AwardProof {
  year: string;
  title: string;
  level: string;
  file: string;
  preview?: string;
  visible?: boolean;
  pdfVisible?: boolean;
}

export const projects: ProjectBrief[] = managedContent.projects;

// Public research output is opt-in. Papers additionally require a verified CAS Q1 tag.
export const publications: Publication[] = managedContent.publications.filter((paper) => paper.visible && paper.highlights.includes('cas-q1'));
export const demos: MediaDemo[] = managedContent.introductionVideos;
export const awardProofs: AwardProof[] = managedContent.outcomeFiles.filter((award) => award.visible).map((award) => ({ ...award, file: award.pdfVisible ? award.file : '' }));
