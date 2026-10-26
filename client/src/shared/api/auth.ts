import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { components } from './schema';
import { ApiError, command, notifySessionExpired, readJson, resetCsrf } from './http';
type Schemas = components['schemas'];
let hadSession = false;
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'], retry: false, staleTime: 0,
  queryFn: async ({ signal }) => {
    try { const value = await readJson<Schemas['Session']>('/api/v1/auth/sessions/current', signal, true); hadSession = true; return value; }
    catch (error) { if (error instanceof ApiError && error.status === 401) { if (hadSession) { hadSession = false; notifySessionExpired(); } return null; } throw error; }
  },
});
export const bootstrapQueryOptions = queryOptions({
  queryKey: ['bootstrap'], queryFn: ({ signal }) => readJson<Schemas['BootstrapStatus']>('/api/v1/auth/bootstrap', signal), staleTime: 0,
});
export async function login(body: Schemas['Login']) { await command('POST', '/api/v1/auth/sessions', body); resetCsrf(); }
export async function bootstrap(body: Schemas['Bootstrap']) { await command('POST', '/api/v1/auth/bootstrap', body); }
export async function logout(all = false) { await command('DELETE', all ? '/api/v1/auth/sessions' : '/api/v1/auth/sessions/current'); hadSession = false; resetCsrf(); }
export async function changePassword(body: Schemas['Password']) { await command('PUT', '/api/v1/me/password', body); resetCsrf(); }
/** The member's own name, as teammates and agents' records show it. */
export const renameMe = (name: string) => command('PATCH', '/api/v1/me', { name });
/** Makes an uploaded square picture the member's own (BIT-30), or takes it away. */
export const changeAvatar = (uploadId: string) => command('PUT', '/api/v1/me/avatar', { uploadId });
export const removeAvatar = () => command('DELETE', '/api/v1/me/avatar');
/** The member's API keys, a page after another (the newest first). */
export const keyQueryOptions = infiniteQueryOptions({
  queryKey: ['api-keys'], initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) => readJson<Schemas['Keys']>(`/api/v1/me/api-keys${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, signal),
  getNextPageParam: page => page.nextCursor ?? undefined,
});
export const createKey = (body: Schemas['CreateKey']) => command<Schemas['CreatedKey']>('POST', '/api/v1/me/api-keys', body);
export const revokeKey = (id: string) => command('DELETE', `/api/v1/me/api-keys/${encodeURIComponent(id)}`);
