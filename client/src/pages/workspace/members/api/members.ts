import { queryOptions } from '@tanstack/react-query';
import { spacePath } from '@/entities/workspace';
import { readJson } from '@/shared/api';
import type { components } from '@/shared/api';
export const invitationsQuery = (id: string, status: string, cursor?: string) => queryOptions({ queryKey: ['workspace', id, 'invitations', status, cursor ?? ''], queryFn: ({ signal }) => readJson<components['schemas']['Invites']>(`${spacePath(id)}/invitations?${new URLSearchParams({ ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) })}`, signal), retry: false });
