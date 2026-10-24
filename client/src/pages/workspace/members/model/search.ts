import { oneOf } from '@/shared/lib/route-search';

/** The members page's address: the tab (구성원 left out) and the search words. */
export type MembersSearch = { view?: 'invitations'; q?: string };
export const parseMembersSearch = (raw: Record<string, unknown>): MembersSearch => ({
  view: oneOf(raw.view, ['invitations'] as const), q: typeof raw.q === 'string' && raw.q.trim() ? raw.q : undefined,
});
