import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, readJson, type components } from '@/shared/api';

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
export async function createProject(w: string, body: components['schemas']['CreateProject']) {
  let location = ''; await command('POST', projectBase(w), body, value => { location = value; });
  const id = location.split('/').at(-1); if (!id) throw new Error('Missing project Location'); return id;
}
export const refreshProjects = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: ['workspace', w] }).catch(() => {});
