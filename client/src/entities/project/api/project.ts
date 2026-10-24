import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type Project = components['schemas']['Project'];
export type BoardColumn = components['schemas']['BoardColumn'];
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export const projectBase = (workspaceId: string) => `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/projects`;
export const projectPath = (workspaceId: string, projectId: string) => `${projectBase(workspaceId)}/${encodeURIComponent(projectId)}`;
export const projectKey = (workspaceId: string, projectId: string) => ['workspace', workspaceId, 'project', projectId] as const;
export const projectQuery = (w: string, p: string) => queryOptions({ queryKey: projectKey(w, p), queryFn: ({ signal }) => readJson<Project>(projectPath(w, p), signal), retry: false });
export const columnsQuery = (w: string, p: string) => queryOptions({ queryKey: [...projectKey(w, p), 'columns'], queryFn: ({ signal }) => readJson<BoardColumn[]>(`${projectPath(w, p)}/columns`, signal), retry: false });
export const projectsQuery = (w: string, status: ProjectStatus = 'active', q = '') => infiniteQueryOptions({
  queryKey: ['workspace', w, 'projects', status, q], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => { const params = new URLSearchParams({ status, q, size: '50' }); if (pageParam) params.set('cursor', pageParam); return readJson<components['schemas']['Projects']>(`${projectBase(w)}?${params}`, signal); },
  getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
});
export const createProject = (w: string, body: components['schemas']['CreateProject']) => createAt(projectBase(w), body);
/** A project key: 2–10 Latin capitals and digits (an old key stays found after a change, D-011). */
export const PROJECT_KEY = /^[A-Z0-9]{2,10}$/;
export const updateProject = (w: string, p: string, body: components['schemas']['UpdateProject']) => command('PATCH', projectPath(w, p), body);
/** Makes a project read-only (archived) or writable again. */
export const archiveProject = (w: string, p: string, expectedVersion: number, isArchived = true) => command('POST', `${projectPath(w, p)}/${isArchived ? 'archive' : 'unarchive'}`, { expectedVersion });
export const deleteProject = (w: string, p: string, expectedVersion: number) => command('DELETE', `${projectPath(w, p)}?expectedVersion=${expectedVersion}`);
export const restoreProject = (w: string, p: string, expectedVersion: number) => command('POST', `${projectPath(w, p)}/restore`, { expectedVersion });
export const createColumn = (w: string, p: string, body: components['schemas']['CreateBoardColumn']) => command('POST', `${projectPath(w, p)}/columns`, body);
export const updateColumn = (w: string, p: string, columnId: string, body: components['schemas']['UpdateBoardColumn']) => command('PATCH', `${projectPath(w, p)}/columns/${encodeURIComponent(columnId)}`, body);
/** Deletes a column, its issues moving to another column or to no status ('backlog'). */
export const deleteColumn = (w: string, p: string, columnId: string, expectedVersion: number, moveTo: string) =>
  command('DELETE', `${projectPath(w, p)}/columns/${encodeURIComponent(columnId)}?expectedVersion=${expectedVersion}&moveTo=${encodeURIComponent(moveTo)}`);
export const reorderColumns = (w: string, p: string, expectedVersion: number, order: string[]) => command('POST', `${projectPath(w, p)}/columns/reorder`, { expectedVersion, order });
export const refreshProjects = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: ['workspace', w] }).catch(() => {});
