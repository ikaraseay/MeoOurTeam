import { t } from './text-config.ts';
/**
 * Only publish outcomes that have a stable, publicly accessible source.
 * Add papers, projects and patents here once their bibliographic details,
 * team attribution, and source links have been checked.
 */
export interface Outcome {
  id: string;
  kind: "outcomes.text011" | "outcomes.text012" | "outcomes.text013" | "outcomes.text014" | "outcomes.text015";
  title: string;
  context: string;
  date: string;
  sourceLabel: string;
  sourceUrl: string;
}

export const outcomes: Outcome[] = [
  {
    id: "sac-2026-llm",
    kind: "outcomes.text011",
    title: t("outcomes.title016"),
    context: t("outcomes.context017"),
    date: "2026-06-29",
    sourceLabel: t("outcomes.sourcelabel018"),
    sourceUrl: "https://example.com/news/",
  },
  {
    id: "sac-2026-monitoring",
    kind: "outcomes.text011",
    title: t("outcomes.title019"),
    context: t("outcomes.context020"),
    date: "2026-06-29",
    sourceLabel: t("outcomes.sourcelabel018"),
    sourceUrl: "https://example.com/news/",
  },
];
