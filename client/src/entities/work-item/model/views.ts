import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/shared/api';
import type { WorkItem } from '../api/work-item';
import { createView, deleteTweak, deleteView, patchView, putTweak, tweaksQuery, viewsQuery, type ServerTweak, type ServerView } from '../api/view';
import { categoryOf, PRIORITY_RANK, SYSTEM_LABEL } from './issue';

/**
 * The views over a workspace's issues (D-066, D-068), as Linear's, in three layers kept on the server: a shared view
 * everyone sees, a personal view only its maker sees ('나만 보기'), and each member's own adjustments to a view (its
 * layout, order and columns), which '초기화' drops and '모두의 기본값으로 저장' writes into the view. '전체 이슈' is built
 * in here, not stored: every issue, a list, never renamed or removed, though a member may still adjust it. Filters are
 * scope-free so one view reads the same in 전체 and in a project: status by category (todo, doing, done, none), labels
 * by id or SYSTEM_LABEL, assignees by user id. Whether the member may change a view is the server's (canEdit).
 */
export type ViewLayout = ServerView['layout'];
export type ViewFilters = components['schemas']['IssueViewFilters'];
export type ViewSort = ServerView['sort'];
export type ViewColumn = ServerView['columns'][number];
export type IssueView = Omit<ServerView, 'description' | 'version' | 'position' | 'createdAt' | 'updatedAt'> & {
  description?: string; version?: number; isBuiltIn?: boolean;
};
/** A member's own adjustments to a view. */
export type ViewTweak = { layout?: ViewLayout; sort?: ViewSort; columns?: ViewColumn[] };

export const ALL_VIEW = 'all';
export const VIEW_LAYOUTS: readonly { value: ViewLayout; label: string; icon: string }[] = [
  { value: 'list', label: '리스트', icon: 'list' }, { value: 'calendar', label: '캘린더', icon: 'calendar' },
  { value: 'board', label: '칸반', icon: 'board' }, { value: 'timeline', label: '타임라인', icon: 'milestone' },
  { value: 'cards', label: '카드', icon: 'grid' }, { value: 'history', label: '히스토리', icon: 'clock' },
];
export const VIEW_COLUMNS: readonly { value: ViewColumn; label: string }[] = [
  { value: 'status', label: '상태' }, { value: 'priority', label: '우선순위' }, { value: 'assignee', label: '담당자' }, { value: 'labels', label: '라벨' },
  { value: 'due', label: '기한' }, { value: 'updated', label: '수정일' }, { value: 'created', label: '만든 날' },
];
export const VIEW_SORT_KEYS = [
  { value: 'updated', label: '수정일', kind: 'date' as const },
  { value: 'created', label: '만든 날', kind: 'date' as const },
  { value: 'priority', label: '우선순위', kind: 'rank' as const },
  { value: 'title', label: '제목', kind: 'text' as const },
];
export const VIEW_ICONS = ['list', 'rows', 'board', 'calendar', 'milestone', 'decision', 'session', 'members', 'person', 'priority', 'label', 'agent'];
export const VIEW_COLORS = ['#95959f', '#5e6ad2', '#26b5ce', '#4cb782', '#f2c94c', '#f2994a', '#eb5757', '#bb87fc'];

/** 전체 이슈, the one view every workspace has and nobody stores. */
const allView = (workspaceId: string): IssueView => ({
  id: ALL_VIEW, workspaceId, name: '전체 이슈', icon: 'list', color: '#95959f', layout: 'list', filters: {}, sort: { key: 'updated', direction: 'desc' },
  columns: ['status', 'priority', 'assignee', 'labels', 'updated'], ownerId: '', isPersonal: false, canEdit: false, isBuiltIn: true,
});
const fromServer = ({ description, position: _position, createdAt: _createdAt, updatedAt: _updatedAt, ...view }: ServerView): IssueView =>
  ({ ...view, description: description ?? undefined });

/** The views the member sees in a workspace: 전체 이슈 first, then the server's in order. */
export function useViews(workspaceId: string): IssueView[] {
  const views = useQuery(viewsQuery(workspaceId)).data;
  return useMemo(() => [allView(workspaceId), ...[...(views ?? [])].sort((a, b) => a.position - b.position).map(fromServer)], [workspaceId, views]);
}
/** The member's adjustments to a view, if any. */
export function useViewTweak(workspaceId: string, viewId: string): ViewTweak | undefined {
  const tweak = useQuery(tweaksQuery(workspaceId)).data?.find(each => each.viewKey === viewId);
  return useMemo(() => (tweak && (tweak.layout || tweak.sort || tweak.columns) ? { layout: tweak.layout, sort: tweak.sort, columns: tweak.columns } : undefined), [tweak]);
}

type ViewDraft = Pick<IssueView, 'name' | 'icon' | 'color' | 'isPersonal' | 'layout' | 'filters' | 'sort' | 'columns'> & { description?: string };
const refreshViews = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: ['workspace', w, 'views'] });

/** Makes a view and answers its id. */
export async function addView(client: QueryClient, workspaceId: string, draft: ViewDraft): Promise<string> {
  const id = await createView(workspaceId, { ...draft, description: draft.description || null });
  await refreshViews(client, workspaceId);
  return id;
}
/** Changes a stored view for everyone who sees it. */
export async function updateView(client: QueryClient, view: IssueView, patch: Partial<ViewDraft>) {
  if (view.isBuiltIn || view.version === undefined) return;
  try { await patchView(view.workspaceId, view.id, { expectedVersion: view.version, ...patch, ...('description' in patch ? { description: patch.description || null } : {}) }); }
  finally { await refreshViews(client, view.workspaceId); }
}
export async function removeView(client: QueryClient, view: IssueView) {
  if (view.isBuiltIn || view.version === undefined) return;
  try { await deleteView(view.workspaceId, view.id, view.version); }
  finally { await Promise.allSettled([refreshViews(client, view.workspaceId), client.invalidateQueries({ queryKey: ['workspace', view.workspaceId, 'view-tweaks'] })]); }
}
/**
 * Keeps the member's adjustment to a view (an empty one drops it). It shows at once: the cached tweaks change before the
 * server answers, and are read again either way.
 */
export async function setViewTweak(client: QueryClient, workspaceId: string, viewKey: string, tweak: ViewTweak | undefined) {
  const isEmpty = !tweak || Object.values(tweak).every(value => value === undefined);
  const key = tweaksQuery(workspaceId).queryKey;
  client.setQueryData<ServerTweak[]>(key, previous => [...(previous ?? []).filter(each => each.viewKey !== viewKey), ...(isEmpty ? [] : [{ viewKey, ...tweak }])]);
  try {
    if (isEmpty) await deleteTweak(workspaceId, viewKey);
    else await putTweak(workspaceId, viewKey, { layout: tweak.layout ?? null, sort: tweak.sort, columns: tweak.columns ?? null });
  } finally { await client.invalidateQueries({ queryKey: key }); }
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
  return { filters, isFiltered, layout: tweak?.layout ?? view.layout, sort: tweak?.sort ?? view.sort, columns: tweak?.columns ?? view.columns, isTweaked: !!tweak };
}

const valuesOf = (value?: string) => (value ? value.split(',').filter(Boolean) : []);

/** The issues a view's filters and the search words keep, in its order. */
export function filterIssues(issues: readonly WorkItem[], filters: ViewFilters, sort: ViewSort, words?: string): WorkItem[] {
  const text = words?.toLowerCase();
  const statuses = valuesOf(filters.status);
  const assignees = valuesOf(filters.assignee);
  const labels = valuesOf(filters.label);
  const sign = sort.direction === 'asc' ? 1 : -1;
  return issues
    .filter(issue => !text || issue.title.toLowerCase().includes(text) || issue.key.toLowerCase().includes(text))
    .filter(issue => statuses.length === 0 || statuses.includes(categoryOf(issue)))
    .filter(issue => !filters.priority || issue.priority === filters.priority)
    .filter(issue => assignees.length === 0 || (issue.assigneeId !== null && assignees.includes(issue.assigneeId)))
    .filter(issue => labels.length === 0 || issue.labels.some(label => labels.includes(label.id) || (label.system && labels.includes(SYSTEM_LABEL))))
    .sort((a, b) => {
      if (sort.key === 'title') return sign * a.title.localeCompare(b.title, 'ko');
      if (sort.key === 'priority') return sign * ((a.priority ? PRIORITY_RANK[a.priority] : 9) - (b.priority ? PRIORITY_RANK[b.priority] : 9));
      const field = sort.key === 'created' ? 'createdAt' : 'updatedAt';
      return sign * a[field].localeCompare(b[field]);
    });
}
