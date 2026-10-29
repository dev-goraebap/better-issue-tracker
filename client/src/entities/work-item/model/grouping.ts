import type { WorkItem } from '../api/work-item';
import { PRIORITIES } from './labels';
import { CATEGORY_LABELS, categoryOf, type Priority, type StatusCategory } from './work-item';

/**
 * What a list's rows are gathered by (D-106), kept with the view: none (one run of rows, no headers), a status, a person,
 * a priority, a type (D-104), a label, or a project (the home's list only; inside a project it reads as none).
 */
export type Grouping = 'none' | 'status' | 'assignee' | 'priority' | 'type' | 'label' | 'project';
export const GROUPINGS: readonly { value: Grouping; label: string }[] = [
  { value: 'none', label: '없음' }, { value: 'status', label: '상태' }, { value: 'assignee', label: '사람' }, { value: 'priority', label: '우선순위' },
  { value: 'type', label: '유형' }, { value: 'label', label: '라벨' }, { value: 'project', label: '프로젝트' },
];

/**
 * One row of a group: the work item, how deep under a parent in the same group it sits, and its parent when that is
 * elsewhere. The tree's lines (D-106) are drawn from the rest: guides says, for each level above the row's own, whether
 * a line runs on down past it (that ancestor has a sibling still to come); isLast whether the row closes its parent's
 * subtasks (└ rather than ├); hasChildren whether a line leaves it downward.
 */
export type ListLine = { item: WorkItem; depth: number; parent?: { key: string; title: string }; guides: boolean[]; isLast: boolean; hasChildren: boolean };
/**
 * A group of rows under its header. count is the work items in it: one with two labels (or two people) is in both groups
 * and counted in each, so the counts may add up to more than the list holds.
 */
export type WorkItemGroup = {
  key: string; label: string; grouping: Grouping; count: number; lines: ListLine[];
  /** What the header's mark is drawn from: a status category, a priority, an id (a person's, a type's, a label's, a project's). */
  value?: string; color?: string;
  /** A work item of the group, for a mark drawn from it (a type's), even with the group folded. */
  sample?: WorkItem;
};

/** What the groups are named and ordered by, beyond the work items themselves. */
export type GroupContext = {
  /** Every work item of the scope, unfiltered: a parent filtered away is still named. */
  all: readonly WorkItem[];
  /** A project's columns in their order: status groups by column there; the home by category. */
  columns?: readonly { id: string; name: string }[];
  types?: readonly { id: string }[];
  labels?: readonly { id: string }[];
  projects?: readonly { id: string; name: string }[];
};

/** How deep a subtask may be drawn; deeper ones line up at this depth. */
export const MAX_DEPTH = 4;
const NONE = '-';
const CATEGORY_ORDER: StatusCategory[] = ['backlog', 'todo', 'doing', 'done', 'canceled', 'none'];
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];
const NONE_LABEL: Record<Exclude<Grouping, 'none'>, string> = {
  status: '상태 없음', assignee: '미배정', priority: '우선순위 없음', type: '유형 없음', label: '라벨 없음', project: '프로젝트 없음',
};

type Slot = { key: string; label: string; value?: string; color?: string };

/** The groups a work item falls in: one, several for a list property, or none's own. */
function slotsOf(item: WorkItem, grouping: Exclude<Grouping, 'none'>, context: GroupContext): Slot[] {
  switch (grouping) {
    case 'status': {
      if (context.columns) {
        const column = item.columnId ? context.columns.find(each => each.id === item.columnId) : undefined;
        return column ? [{ key: column.id, label: column.name, value: categoryOf(item) }] : [];
      }
      const category = categoryOf(item);
      return category === 'none' ? [] : [{ key: category, label: CATEGORY_LABELS[category], value: category }];
    }
    case 'assignee': return item.people.map(person => ({ key: person.id, label: person.name, value: person.id }));
    case 'priority': return item.priority ? [{ key: item.priority, label: PRIORITIES[item.priority], value: item.priority }] : [];
    case 'type': return item.type ? [{ key: item.type.id, label: item.type.name, value: item.type.id }] : [];
    case 'label': return item.labels.map(label => ({ key: label.id, label: label.name, value: label.id, color: label.color }));
    case 'project': {
      const project = item.projectId ? context.projects?.find(each => each.id === item.projectId) : undefined;
      return project ? [{ key: project.id, label: project.name, value: project.id }] : [];
    }
  }
}

/** Where a group stands among the others: the order its property keeps, names for people; none's group last. */
function rankOf(grouping: Exclude<Grouping, 'none'>, slot: Slot, context: GroupContext): number {
  const at = (list: readonly { id: string }[] | undefined) => {
    const index = list?.findIndex(each => each.id === slot.key) ?? -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER - 1 : index;
  };
  switch (grouping) {
    case 'status': return context.columns ? at(context.columns) : CATEGORY_ORDER.indexOf(slot.key as StatusCategory);
    case 'priority': return PRIORITY_ORDER.indexOf(slot.key as Priority);
    case 'type': return at(context.types);
    case 'label': return at(context.labels);
    case 'project': return at(context.projects);
    case 'assignee': return 0;
  }
}

/**
 * A group's rows with each subtask under its parent when the parent is in the same group (D-106), in the list's order
 * among siblings. A subtask whose parent is elsewhere (another group, or filtered away) stands at the top with the
 * parent named; a loop of parents is cut where it closes.
 */
export function nestLines(items: readonly WorkItem[], all: ReadonlyMap<string, WorkItem>): ListLine[] {
  const here = new Set(items.map(item => item.id));
  const children = new Map<string, WorkItem[]>();
  const tops: WorkItem[] = [];
  for (const item of items) {
    if (item.parentId && item.parentId !== item.id && here.has(item.parentId)) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
    else tops.push(item);
  }
  const lines: ListLine[] = [];
  const placed = new Set<string>();
  const place = (item: WorkItem, depth: number, guides: boolean[], isLast: boolean) => {
    if (placed.has(item.id)) return;
    placed.add(item.id);
    const parent = depth === 0 && item.parentId ? all.get(item.parentId) : undefined;
    const kids = (children.get(item.id) ?? []).filter(child => !placed.has(child.id));
    const shown = Math.min(depth, MAX_DEPTH);
    lines.push({ item, depth: shown, guides: guides.slice(0, Math.max(0, shown - 1)), isLast, hasChildren: kids.length > 0,
      ...(parent ? { parent: { key: parent.key, title: parent.title } } : {}) });
    // A child's guides are its parent's, and one more when the parent (not a top row) has a sibling still to come.
    const below = depth >= 1 ? [...guides, !isLast] : [];
    kids.forEach((child, index) => place(child, depth + 1, below, index === kids.length - 1));
  };
  for (const item of tops) place(item, 0, [], true);
  // Work items whose parents only lead to one another have no top; the first of each loop stands as one.
  for (const item of items) place(item, 0, [], true);
  return lines;
}

/** The rows (already filtered and in order) gathered by the grouping, each group's rows nested. */
export function groupWorkItems(rows: readonly WorkItem[], grouping: Grouping, context: GroupContext): WorkItemGroup[] {
  const all = new Map(context.all.map(item => [item.id, item]));
  const effective = grouping === 'project' && !context.projects ? 'none' : grouping;
  if (effective === 'none') return [{ key: 'all', label: '', grouping: 'none', count: rows.length, sample: rows[0], lines: nestLines(rows, all) }];
  const groups = new Map<string, Slot & { items: WorkItem[] }>();
  for (const item of rows) {
    const slots = slotsOf(item, effective, context);
    for (const slot of slots.length ? slots : [{ key: NONE, label: NONE_LABEL[effective] }]) {
      const group = groups.get(slot.key) ?? { ...slot, items: [] };
      group.items.push(item);
      groups.set(slot.key, group);
    }
  }
  return [...groups.values()]
    .sort((a, b) => (a.key === NONE ? 1 : 0) - (b.key === NONE ? 1 : 0) || rankOf(effective, a, context) - rankOf(effective, b, context) || a.label.localeCompare(b.label, 'ko'))
    .map(({ items, ...slot }) => ({ ...slot, grouping: effective, count: items.length, sample: items[0], lines: nestLines(items, all) }));
}

/** A parent's subtasks and how many of them are done, for the progress after its title; a canceled one counts in neither (D-111). */
export function subtaskProgress(all: readonly WorkItem[]): Map<string, { done: number; total: number }> {
  const progress = new Map<string, { done: number; total: number }>();
  for (const item of all) {
    if (!item.parentId) continue;
    if (categoryOf(item) === 'canceled') continue;
    const entry = progress.get(item.parentId) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (categoryOf(item) === 'done') entry.done += 1;
    progress.set(item.parentId, entry);
  }
  return progress;
}

/**
 * Cuts the groups to the first limit rows, headers not counted, so a long list grows by 더 보기; a group cut short keeps
 * its whole count. Collapsed groups keep their header and give up their rows.
 */
export function limitGroups(groups: readonly WorkItemGroup[], limit: number, collapsed: ReadonlySet<string>): { groups: WorkItemGroup[]; shown: number; hasMore: boolean } {
  let left = limit;
  let hasMore = false;
  const shownIds = new Set<string>();
  const cut: WorkItemGroup[] = [];
  for (const group of groups) {
    const open = collapsed.has(group.key) ? [] : group.lines;
    if (left <= 0 && open.length) { hasMore = true; break; }
    const lines = open.slice(0, left);
    if (lines.length < open.length) hasMore = true;
    left -= lines.length;
    for (const line of lines) shownIds.add(line.item.id);
    cut.push({ ...group, lines });
  }
  return { groups: cut, shown: shownIds.size, hasMore };
}
