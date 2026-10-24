import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type Space = components['schemas']['Space'];
export type Member = components['schemas']['Member'];
export type Role = Member['role'];
export type Invitation = components['schemas']['WorkspaceInvitation'];
export const spacePath = (id: string) => `/api/v1/workspaces/${encodeURIComponent(id)}`;
/** Every query about one workspace starts with this key, so one invalidation reaches them all. */
export const workspaceKey = (id: string) => ['workspace', id] as const;

export const workspaceQuery = (id: string) => queryOptions({ queryKey: workspaceKey(id), queryFn: ({ signal }) => readJson<Space>(spacePath(id), signal), retry: false, staleTime: 0 });
/** The first page of the member's workspaces, for deciding where a visit starts. */
export const workspacesQuery = () => queryOptions({ queryKey: ['workspaces', 'first'], queryFn: ({ signal }) => readJson<components['schemas']['Spaces']>('/api/v1/me/workspaces', signal), staleTime: 0 });
/** All the member's workspaces, a page after another (useAllWorkspaces reads them through). */
export const workspacePagesQuery = () => infiniteQueryOptions({
  queryKey: ['workspaces', 'pages'], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => readJson<components['schemas']['Spaces']>(`/api/v1/me/workspaces${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, signal),
  getNextPageParam: page => page.nextCursor ?? undefined,
});
/** A workspace's members, a page after another (useMembers reads them through). */
export const memberPagesQuery = (id: string) => infiniteQueryOptions({
  queryKey: [...workspaceKey(id), 'members'], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => readJson<components['schemas']['Members']>(`${spacePath(id)}/members${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, signal),
  getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
});
/** The workspace's invitations, newest first (owners and admins). */
export const invitationsQuery = (id: string) => queryOptions({
  queryKey: [...workspaceKey(id), 'invitations'], queryFn: ({ signal }) => readJson<components['schemas']['Invites']>(`${spacePath(id)}/invitations`, signal), retry: false,
});

export async function selectWorkspace(id: string) { await command('PUT', '/api/v1/auth/sessions/current/workspace', { workspaceId: id }); }
export const createWorkspace = (name: string, slug: string) => createAt('/api/v1/workspaces', { name, slug });
export const renameWorkspace = (id: string, name: string) => command('PATCH', spacePath(id), { name });
/** Hands the workspace to another member; the owner's password is asked again. */
export const transferOwner = (id: string, userId: string, currentPassword: string) => command('PUT', `${spacePath(id)}/owner`, { userId, currentPassword });
export const deleteWorkspace = (id: string) => command('DELETE', spacePath(id));
export const leaveWorkspace = (id: string) => command('DELETE', `${spacePath(id)}/members/me`);
export const changeRole = (id: string, memberId: string, role: Role) => command('PATCH', `${spacePath(id)}/members/${encodeURIComponent(memberId)}`, { role });
export const removeMember = (id: string, memberId: string) => command('DELETE', `${spacePath(id)}/members/${encodeURIComponent(memberId)}`);
/** Makes a one-time invitation and answers its token, shown once as a link. */
export const createInvitation = (id: string, email: string, role: Role) => command<components['schemas']['CreatedInvitation']>('POST', `${spacePath(id)}/invitations`, { email, role });
export const revokeInvitation = (id: string, invitationId: string) => command('DELETE', `${spacePath(id)}/invitations/${encodeURIComponent(invitationId)}`);

/** After a workspace or its members change: everything about it, and the member's list of workspaces. */
export const refreshWorkspace = (client: QueryClient, id: string) =>
  Promise.allSettled([client.invalidateQueries({ queryKey: workspaceKey(id) }), client.invalidateQueries({ queryKey: ['workspaces'] })]);
/** After the member has lost a workspace (deleted or left): its queries go, and the list is read again. */
export async function forgetWorkspace(client: QueryClient, id: string) {
  await client.cancelQueries({ queryKey: workspaceKey(id) });
  client.removeQueries({ queryKey: workspaceKey(id) });
  await client.invalidateQueries({ queryKey: ['workspaces'] });
}
