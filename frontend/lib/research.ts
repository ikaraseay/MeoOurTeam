import { managedContent } from "./managed-content.mjs";

export interface ResearchDirection {
  /** Stable section anchor, retained when the title or list order changes. */
  id: string;
  title: string;
  content: string;
  advantage: string;
  scene: string;
  image: string;
  imageCaption: string;
}

/** One published data source for the direction page and homepage entrance. */
export const researchDirections: ResearchDirection[] = managedContent.researchDirections;
