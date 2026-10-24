import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type WorkItem = components['schemas']['WorkItem'];
export type ItemLabel = WorkItem['labels'][number];
export type ColumnCategory = NonNullable<WorkItem['columnCategory']>;
/** The lists' conditions; arrays are sent as repeated parameters (projectId, labelId, columnId and category are any-of). */
export type TaskFilters = {
  q?: string; column?: string; assigneeId?: string; priority?: string; triggerType?: string; archived?: boolean; deleted?: boolean; closed?: string;
  from?: string; to?: string; sort?: string; direction?: string; size?: number; hasDates?: boolean;
  projectId?: string[]; labelId?: string[]; columnId?: string[]; category?: string[];
};
export const workBase = (w: string, p: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/projects/${encodeURIComponent(p)}/work-items`;
export const itemPath = (w: string, p: string, id: string) => `${workBase(w, p)}/${encodeURIComponent(id)}`;
const root = (w: string, p: string) => ['workspace', w, 'project', p] as const;
export function taskParams(filters: TaskFilters, cursor?: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach(each => params.append(key, String(each)));
    else if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  }
  if (cursor) params.set('cursor', cursor); return params;
}
export const itemQuery = (w: string, p: string, id: string) => queryOptions({ queryKey: [...root(w, p), 'item', id], queryFn: ({ signal }) => readJson<WorkItem>(itemPath(w, p, id), signal), retry: false });
export const itemsQuery = (w: string, p: string, filters: TaskFilters = {}) => infiniteQueryOptions({
  queryKey: [...root(w, p), 'items', filters], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => readJson<components['schemas']['WorkItems']>(`${workBase(w, p)}?${taskParams(filters, pageParam)}`, signal), getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
});
/** Every project's issues in a workspace (전체, D-065): the same items and paging as a project's list. */
export const workspaceItemsQuery = (w: string, filters: TaskFilters = {}) => infiniteQueryOptions({
  queryKey: ['workspace', w, 'items', filters], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => readJson<components['schemas']['WorkItems']>(`/api/v1/workspaces/${encodeURIComponent(w)}/work-items?${taskParams(filters, pageParam)}`, signal),
  getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
});
export const countsQuery = (w: string, p: string, filters: TaskFilters = {}) => queryOptions({ queryKey: [...root(w, p), 'counts', filters], queryFn: ({ signal }) => readJson<components['schemas']['WorkItemColumnCount'][]>(`${workBase(w, p)}/counts?${taskParams(filters)}`, signal), retry: false });
export const myTasksQuery = (w: string, filters: TaskFilters = {}) => infiniteQueryOptions({ queryKey: ['workspace', w, 'my-tasks', filters], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam, signal }) => readJson<components['schemas']['WorkItems']>(`/api/v1/workspaces/${encodeURIComponent(w)}/my-tasks?${taskParams(filters, pageParam)}`, signal), getNextPageParam: page => page.nextCursor ?? undefined, retry: false });
export const byRefQuery = (w: string, reference: string) => queryOptions({ queryKey: ['workspace', w, 'task-ref', reference], queryFn: ({ signal }) => readJson<WorkItem>(`/api/v1/workspaces/${encodeURIComponent(w)}/work-items/by-ref/${encodeURIComponent(reference)}`, signal), retry: false });
export const createItem = (w: string, p: string, body: components['schemas']['CreateWorkItem']) => createAt(workBase(w, p), body);
export const moveItem = (w: string, p: string, id: string, body: components['schemas']['MoveWorkItem']) => command('POST', `${itemPath(w, p, id)}/move`, body);
/** Changes an issue's fields (absent ones kept); a stale expectedVersion is 409. */
export const updateItem = (w: string, p: string, id: string, body: components['schemas']['UpdateWorkItem']) => command('PATCH', itemPath(w, p, id), body);
/** Moves an issue out of the lists (archived) or back. */
export const archiveItem = (w: string, p: string, id: string, expectedVersion: number, isArchived = true) => command('POST', `${itemPath(w, p, id)}/${isArchived ? 'archive' : 'unarchive'}`, { expectedVersion });
/** Deletes an issue (soft: an administrator can restore it). */
export const deleteItem = (w: string, p: string, id: string, expectedVersion: number) => command('DELETE', `${itemPath(w, p, id)}?expectedVersion=${expectedVersion}`);
export const refreshItems = (client: QueryClient, w: string, p: string) => Promise.allSettled([client.invalidateQueries({ queryKey: root(w, p) }), client.invalidateQueries({ queryKey: ['workspace', w, 'items'] }), client.invalidateQueries({ queryKey: ['workspace', w, 'my-tasks'] }), client.invalidateQueries({ queryKey: ['workspace', w, 'task-ref'] })]);
