import { useSyncExternalStore } from 'react';
import { valuesOf } from '@/shared/ui';
import { ME, PRIORITY_RANK, workspaceOf } from './mock';
import { DECISION_LABEL, type Issue } from './issues';

/**
 * The views over a workspace's issues (D-066, D-068), as Linear's, in three layers: a shared view everyone sees, a
 * personal view only its maker sees ('나만 보기'), and each member's own adjustments to a shared view (its layout, order
 * and columns), which '초기화' drops and '모두의 기본값으로 저장' writes into the view. '전체 이슈' is built in: every
 * issue, a list, never renamed or removed. The demo keeps views and adjustments in this browser (localStorage); the real
 * app keeps views on the server and adjustments with each member.
 */
export type ViewLayout = 'list' | 'calendar' | 'board' | 'timeline' | 'cards' | 'history';
export type ViewFilters = { status?: string; priority?: string; assignee?: string; label?: string };
export type ViewSort = { key: string; direction: 'asc' | 'desc' };
export type ViewColumn = 'status' | 'priority' | 'assignee' | 'labels' | 'due' | 'comments' | 'updated' | 'created';
export type IssueView = {
  id: string; workspaceId: string; name: string; icon: string; color: string; description?: string;
  layout: ViewLayout; filters: ViewFilters; sort: ViewSort; columns: ViewColumn[];
  ownerId: string; isPersonal: boolean; isBuiltIn?: boolean;
};
/** A member's own adjustments to a shared view. */
export type ViewTweak = { layout?: ViewLayout; sort?: ViewSort; columns?: ViewColumn[] };

export const ALL_VIEW = 'all';
export const VIEW_LAYOUTS: readonly { value: ViewLayout; label: string; icon: string }[] = [
  { value: 'list', label: '리스트', icon: 'list' }, { value: 'calendar', label: '캘린더', icon: 'calendar' },
  { value: 'board', label: '칸반', icon: 'board' }, { value: 'timeline', label: '타임라인', icon: 'milestone' },
  { value: 'cards', label: '카드', icon: 'grid' }, { value: 'history', label: '히스토리', icon: 'clock' },
];
export const VIEW_COLUMNS: readonly { value: ViewColumn; label: string }[] = [
  { value: 'status', label: '상태' }, { value: 'priority', label: '우선순위' }, { value: 'assignee', label: '담당자' }, { value: 'labels', label: '라벨' },
  { value: 'due', label: '기한' }, { value: 'comments', label: '댓글' }, { value: 'updated', label: '수정일' }, { value: 'created', label: '만든 날' },
];
export const VIEW_ICONS = ['list', 'rows', 'board', 'calendar', 'milestone', 'decision', 'session', 'members', 'person', 'priority', 'label', 'agent'];
export const VIEW_COLORS = ['#95959f', '#5e6ad2', '#26b5ce', '#4cb782', '#f2c94c', '#f2994a', '#eb5757', '#bb87fc'];
const USUAL_COLUMNS: ViewColumn[] = ['status', 'priority', 'assignee', 'labels', 'comments', 'updated'];
const USUAL_SORT: ViewSort = { key: 'updated', direction: 'desc' };

/** The views a workspace starts with: 전체 이슈, then a few the team would make itself. */
function starters(workspaceId: string): IssueView[] {
  const base = { workspaceId, ownerId: 'u1', isPersonal: false, sort: USUAL_SORT, columns: USUAL_COLUMNS };
  return [
    { ...base, id: ALL_VIEW, name: '전체 이슈', icon: 'list', color: '#95959f', layout: 'list', filters: {}, isBuiltIn: true },
    { ...base, id: `${workspaceId}-backlog`, name: '백로그', icon: 'rows', color: '#95959f', layout: 'list', filters: { status: 'todo' }, sort: { key: 'priority', direction: 'asc' } },
    { ...base, id: `${workspaceId}-board`, name: '진행 보드', icon: 'board', color: '#f2c94c', layout: 'board', filters: {} },
    { ...base, id: `${workspaceId}-calendar`, name: '일정', icon: 'calendar', color: '#4cb782', layout: 'calendar', filters: {} },
    { ...base, id: `${workspaceId}-notes`, name: '회의록', icon: 'session', color: '#26b5ce', layout: 'cards', filters: { label: '회의록,세션 요약' }, columns: ['labels', 'assignee', 'comments', 'created'], sort: { key: 'created', direction: 'desc' } },
    { ...base, id: `${workspaceId}-decisions`, name: DECISION_LABEL, icon: 'decision', color: '#5e6ad2', layout: 'history', filters: { label: DECISION_LABEL }, columns: ['assignee', 'labels', 'updated'] },
  ];
}

const VIEWS_KEY = 'bit-demo-views';
const TWEAKS_KEY = 'bit-demo-view-tweaks';
const read = <T,>(key: string, fallback: T): T => { try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* This visit still keeps it in memory. */ } };

let views: Record<string, IssueView[]> = read(VIEWS_KEY, {});
let tweaks: Record<string, ViewTweak> = read(TWEAKS_KEY, {});
let version = 0;
const listeners = new Set<() => void>();
const changed = () => { version += 1; write(VIEWS_KEY, views); write(TWEAKS_KEY, tweaks); listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const listOf = (workspaceId: string) => views[workspaceId] ?? starters(workspaceId);

/** The views the member sees in a workspace: the shared ones and their own personal ones, in order. */
export function useViews(workspaceId: string): IssueView[] {
  useSyncExternalStore(subscribe, () => version);
  return listOf(workspaceId).filter(view => !view.isPersonal || view.ownerId === ME);
}
/** The member's adjustments to a view, if any. */
export function useViewTweak(viewId: string): ViewTweak | undefined {
  useSyncExternalStore(subscribe, () => version);
  return tweaks[viewId];
}
/** Whether the member may change a view for everyone: its maker, or the workspace's owner or admin (D-068). */
export const canEditView = (view: IssueView) => !view.isBuiltIn && (view.ownerId === ME || ['owner', 'admin'].includes(workspaceOf(view.workspaceId)?.myRole ?? ''));

export function addView(draft: Omit<IssueView, 'id' | 'ownerId'>): string {
  const id = `view-${Date.now().toString(36)}`;
  views = { ...views, [draft.workspaceId]: [...listOf(draft.workspaceId), { ...draft, id, ownerId: ME }] };
  changed();
  return id;
}
export function updateView(workspaceId: string, id: string, patch: Partial<Omit<IssueView, 'id' | 'workspaceId' | 'ownerId' | 'isBuiltIn'>>) {
  views = { ...views, [workspaceId]: listOf(workspaceId).map(view => (view.id === id ? { ...view, ...patch } : view)) };
  changed();
}
export function removeView(workspaceId: string, id: string) {
  views = { ...views, [workspaceId]: listOf(workspaceId).filter(view => view.id !== id || view.isBuiltIn) };
  const { [id]: _dropped, ...rest } = tweaks;
  tweaks = rest;
  changed();
}
/** Keeps the member's adjustment to a view; an empty one drops it. */
export function setViewTweak(viewId: string, tweak: ViewTweak | undefined) {
  const { [viewId]: _old, ...rest } = tweaks;
  tweaks = tweak && Object.values(tweak).some(value => value !== undefined) ? { ...rest, [viewId]: tweak } : rest;
  changed();
}

/** The address's conditions over a view: a filter the address names (or '-' for none) stands over the view's own. */
export type ViewSearch = { q?: string; status?: string; priority?: string; assignee?: string; label?: string };
export const FILTER_KEYS = ['status', 'priority', 'assignee', 'label'] as const;
export const NO_FILTER = '-';

/** What a view shows for this member and this address: its filters, layout, order and columns, and what was changed. */
export function effectiveView(view: IssueView, tweak: ViewTweak | undefined, search: ViewSearch) {
  const filters: ViewFilters = {};
  for (const key of FILTER_KEYS) {
    const given = search[key];
    const value = given === undefined ? view.filters[key] : given === NO_FILTER ? undefined : given;
    if (value) filters[key] = value;
  }
  const isFiltered = FILTER_KEYS.some(key => (filters[key] ?? '') !== (view.filters[key] ?? ''));
  return {
    filters, isFiltered, layout: tweak?.layout ?? view.layout, sort: tweak?.sort ?? view.sort, columns: tweak?.columns ?? view.columns,
    isTweaked: !!tweak,
  };
}

/** The issues a view's filters and the search words keep, in its order. */
export function filterIssues(issues: readonly Issue[], filters: ViewFilters, sort: ViewSort, words?: string): Issue[] {
  const text = words?.toLowerCase();
  const statuses = valuesOf(filters.status);
  const assignees = valuesOf(filters.assignee);
  const labels = valuesOf(filters.label);
  const sign = sort.direction === 'asc' ? 1 : -1;
  return issues
    .filter(issue => !text || issue.title.toLowerCase().includes(text) || issue.key.toLowerCase().includes(text))
    .filter(issue => statuses.length === 0 || (issue.status !== undefined && statuses.includes(issue.status)))
    .filter(issue => !filters.priority || issue.priority === filters.priority)
    .filter(issue => assignees.length === 0 || (issue.assigneeId !== undefined && assignees.includes(issue.assigneeId)))
    .filter(issue => labels.length === 0 || issue.labels.some(label => labels.includes(label)))
    .sort((a, b) => {
      if (sort.key === 'title') return sign * a.title.localeCompare(b.title, 'ko');
      if (sort.key === 'priority') return sign * ((a.priority ? PRIORITY_RANK[a.priority] : 9) - (b.priority ? PRIORITY_RANK[b.priority] : 9));
      const field = sort.key === 'created' ? 'createdAt' : 'updatedAt';
      return sign * a[field].localeCompare(b[field]);
    });
}
