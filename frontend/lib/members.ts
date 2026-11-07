import { managedContent } from "./managed-content.mjs";
import { publicMemberGroups } from "./member-groups.mjs";

/** Public profiles approved for display on the team site. */
export interface Member {
  id?: string;
  name: string;
  role: string;
  focus: string;
  email?: string;
  homepage?: string;
  photo?: string;
  /** Plain text biography, optionally separated into paragraphs. */
  bio?: string;
}

export interface MemberGroup {
  id: string;
  title: string;
  people: Member[];
}

// Public lists omit empty groups; the admin continues to use the complete catalog.
export const peopleGroups: MemberGroup[] = publicMemberGroups(managedContent.peopleGroups);
export const members: Member[] = peopleGroups.flatMap((group) => group.people);
