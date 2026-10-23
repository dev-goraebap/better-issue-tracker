import { findingOf, oneOf } from '@/shared/lib/route-search';
import type { SortKey } from '@/shared/ui';

/**
 * The demo lists' conditions as their addresses hold them: every filter, the search words and the order live in the URL
 * (bit-frontend 04 §3), defaults left out, so a reload, the back button and a shared link show the same list.
 */
export type TableSearch = { q?: string; status?: string; priority?: string; assignee?: string; sort?: string; direction?: 'asc' | 'desc'; finding?: 1 };
export type TabsSearch = { tab?: 'mine' | 'review'; q?: string };
export type InboxSearch = { read?: 'unread' | 'read'; kind?: string };
export type StatesSearch = { state?: 'empty' | 'search' | 'not-found' | 'error' | 'loading' };

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);

export const TABLE_SORT_KEYS: readonly SortKey[] = [
  { value: 'updated', label: '수정일', kind: 'date' },
  { value: 'created', label: '만든 날', kind: 'date' },
  { value: 'priority', label: '우선순위', kind: 'rank' },
  { value: 'title', label: '제목', kind: 'text' },
];

export function parseTableSearch(raw: Record<string, unknown>): TableSearch {
  return {
    q: text(raw.q), status: text(raw.status), priority: text(raw.priority), assignee: text(raw.assignee),
    sort: oneOf(raw.sort, TABLE_SORT_KEYS.map(key => key.value)), direction: oneOf(raw.direction, ['asc', 'desc'] as const), finding: findingOf(raw),
  };
}
export const parseTabsSearch = (raw: Record<string, unknown>): TabsSearch => ({ tab: oneOf(raw.tab, ['mine', 'review'] as const), q: text(raw.q) });
export const parseInboxSearch = (raw: Record<string, unknown>): InboxSearch => ({ read: oneOf(raw.read, ['unread', 'read'] as const), kind: text(raw.kind) });
export const parseStatesSearch = (raw: Record<string, unknown>): StatesSearch => ({ state: oneOf(raw.state, ['empty', 'search', 'not-found', 'error', 'loading'] as const) });

/** Whether a table search narrows the list (words or filters), which decides between the empty and no-match states. */
export const isNarrowed = (search: TableSearch) => !!(search.q || search.status || search.priority || search.assignee);
