import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/shared/api';
import { MARK_ICONS } from '@/shared/config';
import type { WorkItem } from '../api/work-item';
import {
  createView, deleteTweak, deleteView, patchView, putTweak, putViewOrder, tweaksQuery, viewOrdersQuery, viewsQuery, type ServerTweak, type ServerView, type ServerViewOrder,
} from '../api/view';
import type { Grouping } from './grouping';
import { categoryOf, PRIORITY_RANK, SYSTEM_LABEL } from './work-item';
import { orderViews } from './view-order';

/**
 * The views over a workspace's work items (D-066, D-068), as Linear's, in three layers kept on the server: a shared view
 * everyone sees, a personal view only its maker sees ('나만 보기'), and each member's own adjustments to a view (its
 * layout, order, columns and grouping), which '초기화' drops and '모두의 기본값으로 저장' writes into the view. '전체 업무' is built
 * in here, not stored: every work item, a list, never renamed or removed, though a member may still adjust it. Filters are
 * scope-free so one view reads the same in 전체 and in a project: status by category (todo, doing, done, none), labels
 * by id or SYSTEM_LABEL, assignees by user id. Whether the member may change a view is the server's (canEdit).
 */
export type ViewLayout = ServerView['layout'];
export type ViewFilters = components['schemas']['WorkItemViewFilters'];
export type ViewSort = ServerView['sort'];
export type ViewColumn = ServerView['columns'][number];
export type WorkItemView = Omit<ServerView, 'description' | 'version' | 'position' | 'createdAt' | 'updatedAt'> & {
  description?: string; version?: number; isBuiltIn?: boolean;
};
/** A member's own adjustments to a view: its layout, order, columns and grouping (D-106). */
export type ViewTweak = { layout?: ViewLayout; sort?: ViewSort; columns?: ViewColumn[]; grouping?: Grouping };

export const ALL_VIEW = 'all';
/** The home's scope in the views' orders; a project's is its id (D-088). */
export const HOME_SCOPE = 'home';
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
export const VIEW_ICONS = MARK_ICONS;

/** 전체 업무, the one view every workspace has and nobody stores. */
const allView = (workspaceId: string): WorkItemView => ({
  id: ALL_VIEW, workspaceId, name: '전체 업무', icon: 'list', color: '#95959f', layout: 'list', filters: {}, sort: { key: 'updated', direction: 'desc' },
  columns: ['status', 'priority', 'assignee', 'labels', 'updated'], grouping: 'none', ownerId: '', isPersonal: false, canEdit: false, isBuiltIn: true,
});
const fromServer = ({ description, position: _position, createdAt: _createdAt, updatedAt: _updatedAt, ...view }: ServerView): WorkItemView =>
  ({ ...view, description: description ?? undefined });

/** The views the member sees in a scope (HOME_SCOPE or a project's id), in that scope's order; the first is its default. */
export function useViews(workspaceId: string, scope: string): WorkItemView[] {
  const views = useQuery(viewsQuery(workspaceId)).data;
  const keys = useQuery(viewOrdersQuery(workspaceId)).data?.find(order => order.scope === scope)?.viewKeys;
  return useMemo(() => orderViews([allView(workspaceId), ...[...(views ?? [])].sort((a, b) => a.position - b.position).map(fromServer)], keys),
    [workspaceId, views, keys]);
}
/** The member's adjustments to a view, if any. */
export function useViewTweak(workspaceId: string, viewId: string): ViewTweak | undefined {
  const tweak = useQuery(tweaksQuery(workspaceId)).data?.find(each => each.viewKey === viewId);
  return useMemo(() => (tweak && (tweak.layout || tweak.sort || tweak.columns || tweak.grouping)
    ? { layout: tweak.layout, sort: tweak.sort, columns: tweak.columns, grouping: tweak.grouping ?? undefined } : undefined), [tweak]);
}

type ViewDraft = Pick<WorkItemView, 'name' | 'icon' | 'color' | 'isPersonal' | 'layout' | 'filters' | 'sort' | 'columns'> & { description?: string; grouping?: Grouping };
const refreshViews = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: ['workspace', w, 'views'] });

/** Makes a view and answers its id. */
export async function addView(client: QueryClient, workspaceId: string, draft: ViewDraft): Promise<string> {
  const id = await createView(workspaceId, { ...draft, description: draft.description || null });
  await refreshViews(client, workspaceId);
  return id;
}
/** Changes a stored view for everyone who sees it. */
export async function updateView(client: QueryClient, view: WorkItemView, patch: Partial<ViewDraft>) {
  if (view.isBuiltIn || view.version === undefined) return;
  try { await patchView(view.workspaceId, view.id, { expectedVersion: view.version, ...patch, ...('description' in patch ? { description: patch.description || null } : {}) }); }
  finally { await refreshViews(client, view.workspaceId); }
}
export async function removeView(client: QueryClient, view: WorkItemView) {
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
    else await putTweak(workspaceId, viewKey, { layout: tweak.layout ?? null, sort: tweak.sort, columns: tweak.columns ?? null, grouping: tweak.grouping ?? null });
  } finally { await client.invalidateQueries({ queryKey: key }); }
}

/**
 * Puts a scope's views in a new order, its first the scope's default (D-088). It shows at once: the cached orders change
 * before the server answers, and are read again either way.
 */
export async function setViewOrder(client: QueryClient, workspaceId: string, scope: string, viewKeys: string[]) {
  const key = viewOrdersQuery(workspaceId).queryKey;
  client.setQueryData<ServerViewOrder[]>(key, previous => [...(previous ?? []).filter(each => each.scope !== scope), { scope, viewKeys }]);
  try { await putViewOrder(workspaceId, scope, viewKeys); }
  finally { await client.invalidateQueries({ queryKey: key }); }
}

/**
 * The address's conditions over a view: a filter the address names (or '-' for none) stands over the view's own. The
 * work item types (type, D-104) are the address's alone: a view's stored filters have no type, so it is never saved.
 */
export type ViewSearch = { q?: string; status?: string; priority?: string; assignee?: string; label?: string; type?: string };
export const FILTER_KEYS = ['status', 'priority', 'assignee', 'label'] as const;
export const NO_FILTER = '-';

/** What a view shows for this member and this address: its filters, layout, order, columns and grouping, and what was changed. */
export function effectiveView(view: WorkItemView, tweak: ViewTweak | undefined, search: ViewSearch) {
  const filters: ViewFilters = {};
  for (const key of FILTER_KEYS) {
    const given = search[key];
    const value = given === undefined ? view.filters[key] : given === NO_FILTER ? undefined : given;
    if (value) filters[key] = value;
  }
  const isFiltered = FILTER_KEYS.some(key => (filters[key] ?? '') !== (view.filters[key] ?? ''));
  return { filters, isFiltered, types: search.type, layout: tweak?.layout ?? view.layout, sort: tweak?.sort ?? view.sort, columns: tweak?.columns ?? view.columns,
    grouping: tweak?.grouping ?? view.grouping ?? 'none', isTweaked: !!tweak };
}

const valuesOf = (value?: string) => (value ? value.split(',').filter(Boolean) : []);

/** The work items a view's filters, the address's types (a comma list of ids; events have none) and the search words keep, in its order. */
export function filterWorkItems(workItems: readonly WorkItem[], filters: ViewFilters, sort: ViewSort, words?: string, types?: string): WorkItem[] {
  const text = words?.toLowerCase();
  // none is what the backlog was called before it was a status of its own (D-111).
  const statuses = valuesOf(filters.status).map(status => (status === 'none' ? 'backlog' : status));
  const assignees = valuesOf(filters.assignee);
  const labels = valuesOf(filters.label);
  const typeIds = valuesOf(types);
  const sign = sort.direction === 'asc' ? 1 : -1;
  return workItems
    .filter(workItem => !text || workItem.title.toLowerCase().includes(text) || workItem.key.toLowerCase().includes(text))
    .filter(workItem => statuses.length === 0 || statuses.includes(categoryOf(workItem)))
    .filter(workItem => !filters.priority || workItem.priority === filters.priority)
    .filter(workItem => assignees.length === 0 || workItem.people.some(person => assignees.includes(person.id)))
    .filter(workItem => typeIds.length === 0 || (!!workItem.type && typeIds.includes(workItem.type.id)))
    .filter(workItem => labels.length === 0 || workItem.labels.some(label => labels.includes(label.id) || (label.system && labels.includes(SYSTEM_LABEL))))
    .sort((a, b) => {
      if (sort.key === 'title') return sign * a.title.localeCompare(b.title, 'ko');
      if (sort.key === 'priority') return sign * ((a.priority ? PRIORITY_RANK[a.priority] : 9) - (b.priority ? PRIORITY_RANK[b.priority] : 9));
      const field = sort.key === 'created' ? 'createdAt' : 'updatedAt';
      return sign * a[field].localeCompare(b[field]);
    });
}
