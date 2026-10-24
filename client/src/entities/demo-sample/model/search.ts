import { findingOf, oneOf } from '@/shared/lib/route-search';
import { parsePanelPlace, type PanelPlace } from '@/shared/lib/routed-panel';
import type { SortKey } from '@/shared/ui';

/**
 * The demo lists' conditions as their addresses hold them: every filter, the search words, the order, the tab and the
 * view live in the URL (bit-frontend 04 §3), defaults left out, so a reload, the back button and a shared link show the
 * same list.
 */
export type TableSearch = { q?: string; status?: string; priority?: string; assignee?: string; sort?: string; direction?: 'asc' | 'desc'; finding?: 1 };
/**
 * The issue pages (전체 and a project's, D-066): the view in sight (전체 이슈 when left out), the filters changed over the
 * view's own ('-' for one taken off, D-068), the search words, the calendar's own place (cal, date), and the issue open
 * in the modal over them (panel, depth: the address bar shows the issue's own, D-069).
 */
export type IssueSearch = PanelPlace & { v?: string; q?: string; status?: string; priority?: string; assignee?: string; label?: string; cal?: 'week' | 'workweek'; date?: string; finding?: 1 };
export type InboxSearch = { read?: 'unread' | 'read'; kind?: string };
export type MembersSearch = { view?: 'invitations'; q?: string };
export type ProjectsSearch = { status?: 'archived'; q?: string };
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
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const parseIssueSearch = (raw: Record<string, unknown>): IssueSearch => ({
  v: text(raw.v), q: text(raw.q), status: text(raw.status), priority: text(raw.priority), assignee: text(raw.assignee), label: text(raw.label),
  cal: oneOf(raw.cal, ['week', 'workweek'] as const), date: typeof raw.date === 'string' && DAY.test(raw.date) ? raw.date : undefined, finding: findingOf(raw),
  ...parsePanelPlace(raw),
});
export const parseInboxSearch = (raw: Record<string, unknown>): InboxSearch => ({ read: oneOf(raw.read, ['unread', 'read'] as const), kind: text(raw.kind) });
export const parseMembersSearch = (raw: Record<string, unknown>): MembersSearch => ({ view: oneOf(raw.view, ['invitations'] as const), q: text(raw.q) });
export const parseProjectsSearch = (raw: Record<string, unknown>): ProjectsSearch => ({ status: oneOf(raw.status, ['archived'] as const), q: text(raw.q) });
export const parseStatesSearch = (raw: Record<string, unknown>): StatesSearch => ({ state: oneOf(raw.state, ['empty', 'search', 'not-found', 'error', 'loading'] as const) });

/** Whether a table search narrows the list (words or filters), which decides between the empty and no-match states. */
export const isNarrowed = (search: TableSearch) => !!(search.q || search.status || search.priority || search.assignee);
