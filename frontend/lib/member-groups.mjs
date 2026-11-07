import { t } from './text-config.ts';

// These groups remain available in the editor even when their public lists are empty.
export function academicMemberGroups() {
  return [
    { id: 'postdocs', title: t('members.groupPostdocs'), people: [] },
    { id: 'doctoral', title: t('members.groupDoctoral'), people: [] },
    { id: 'masters', title: t('members.groupMasters'), people: [] },
  ];
}

/** Upgrade the former combined group without guessing an unspecified degree.
 * Unknown legacy records stay in the editor for manual assignment. A member's
 * explicit non-legacy group always wins over keywords in their biography.
 * This is pure and idempotent; reading never writes administrator data to disk.
 */
export function splitLegacyMemberGroups(groups) {
  const categories = academicMemberGroups();
  const result = groups.filter((group) => group.id !== 'students').map((group) => ({ ...group, people: [...group.people] }));
  for (const category of categories) {
    if (!result.some((group) => group.id === category.id)) {
      const previousId = category.id === 'postdocs' ? 'faculty' : categories[categories.indexOf(category) - 1].id;
      const previous = result.findIndex((group) => group.id === previousId);
      result.splice(previous < 0 ? result.length : previous + 1, 0, category);
    }
  }
  const unassigned = [];
  for (const group of groups.filter((group) => group.id === 'students')) {
    for (const person of group.people) {
      const role = person.role.trim();
      const doctoral = /博士生|博士研究生|ph\.?d\.?\s*(student|candidate)/i.test(role);
      const masters = /硕士生|硕士研究生|master.?s?\s*student/i.test(role);
      const student = !/导师|教授|教师/.test(role);
      const id = /博士后|post[ -]?doc/i.test(role) ? 'postdocs'
        : student && doctoral && !masters ? 'doctoral'
        : student && masters && !doctoral ? 'masters' : null;
      if (!id) { unassigned.push(person); continue; }
      const target = result.find((item) => item.id === id);
      // Avoid duplicate copies when a partially migrated input contains both groups.
      if (!target.people.some((item) => JSON.stringify(item) === JSON.stringify(person))) target.people.push(person);
    }
  }
  if (unassigned.length) result.push({ id: 'students', title: t('members.groupUnassigned'), people: unassigned });
  return result;
}

/** Placeholder names are editing aids, not real public profiles. */
export function publicMemberGroups(groups) {
  return groups.filter((group) => group.id !== 'students')
    .map((group) => ({ ...group, people: group.people.filter((person) => !['', '待补充', '暂未公布'].includes(person.name.trim())) }))
    .filter((group) => group.people.length > 0);
}
