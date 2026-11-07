import { managedContent } from "./managed-content.mjs";
import { t } from "./text-config.ts";

export const homepageSections = managedContent.homepage;

/** Homepage profile copy; managed papers and videos stay in their own data source. */
export const teamMilestones = [
  t("home.text028"),
  t("home.text029"),
  t("home.text030"),
  t("home.text031"),
];

export const honors = [
  t("home.text032"),
  t("home.text033"),
  t("home.text034"),
];
