import { oneOf } from '@/shared/lib/route-search';

/** The members page's address: the tab (구성원 left out), the search words, the role in view and the order (usual left out). */
export type MembersSearch = { view?: 'invitations'; q?: string; role?: 'owner' | 'admin' | 'member' | 'viewer'; sort?: 'joined' | 'name' | 'role'; dir?: 'asc' | 'desc' };
export const parseMembersSearch = (raw: Record<string, unknown>): MembersSearch => ({
  view: oneOf(raw.view, ['invitations'] as const), q: typeof raw.q === 'string' && raw.q.trim() ? raw.q : undefined,
  role: oneOf(raw.role, ['owner', 'admin', 'member', 'viewer'] as const), sort: oneOf(raw.sort, ['joined', 'name', 'role'] as const), dir: oneOf(raw.dir, ['asc', 'desc'] as const),
});
