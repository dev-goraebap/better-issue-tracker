import { isId } from '@/shared/lib/route-search';
export type InboxSearch = { notice?: string; filter?: 'unread' };
/** A notice id keeps the selected message across reloads; its own API enforces recipient access. */
export const parseInboxSearch = (raw: Record<string, unknown>): InboxSearch => ({
  notice: isId(raw.notice) ? raw.notice : undefined,
  filter: raw.filter === 'unread' ? 'unread' : undefined,
});
