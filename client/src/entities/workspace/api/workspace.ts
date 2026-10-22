import { queryOptions } from '@tanstack/react-query';
import { command, readJson } from '@/shared/api';
import type { components } from '@/shared/api';

export type Space = components['schemas']['Space'];
export type Member = components['schemas']['Member'];
export const spacePath = (id: string) => `/api/v1/workspaces/${encodeURIComponent(id)}`;
export const workspaceQuery = (id: string) => queryOptions({ queryKey: ['workspace', id], queryFn: ({ signal }) => readJson<Space>(spacePath(id), signal), retry: false, staleTime: 0 });
export const workspacesQuery = (cursor?: string) => queryOptions({ queryKey: ['workspaces', cursor ?? ''], queryFn: ({ signal }) => readJson<components['schemas']['Spaces']>(`/api/v1/me/workspaces${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, signal), staleTime: 0 });
export const membersQuery = (id: string, cursor?: string) => queryOptions({ queryKey: ['workspace', id, 'members', cursor ?? ''], queryFn: ({ signal }) => readJson<components['schemas']['Members']>(`${spacePath(id)}/members${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, signal), retry: false });
export async function selectWorkspace(id: string) { await command('PUT', '/api/v1/auth/sessions/current/workspace', { workspaceId: id }); }
export async function createWorkspace(name: string, slug: string) {
  let location = '';
  await command('POST', '/api/v1/workspaces', { name, slug }, value => { location = value; });
  const id = location.split('/').at(-1);
  if (!id) throw new Error('Missing workspace Location');
  return id;
}
