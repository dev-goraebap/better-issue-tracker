import { findingOf, oneOf } from '@/shared/lib/route-search';
import { parsePanelPlace, type PanelPlace } from '@/shared/lib/routed-panel';

/**
 * The issue pages' conditions as their addresses hold them (전체 and a project's, D-066): the view in sight (전체 이슈
 * when left out), the filters changed over the view's own ('-' for one taken off, D-068), the search words, the
 * calendar's month (date), and the issue open in the modal over them (panel, depth: the address bar shows the issue's
 * own, D-069). Defaults are left out, so a reload, the back button and a shared link show the same list.
 */
export type IssueSearch = PanelPlace & { v?: string; q?: string; status?: string; priority?: string; assignee?: string; label?: string; date?: string; finding?: 1 };
/** 새 이슈's address: where it starts (a board column's + passes its column in a project, its category in 전체, or none). */
export type NewIssueSearch = { status?: string };

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const parseIssueSearch = (raw: Record<string, unknown>): IssueSearch => ({
  v: text(raw.v), q: text(raw.q), status: text(raw.status), priority: oneOf(raw.priority, ['urgent', 'high', 'medium', 'low'] as const), assignee: text(raw.assignee),
  label: text(raw.label), date: typeof raw.date === 'string' && DAY.test(raw.date) ? raw.date : undefined, finding: findingOf(raw),
  ...parsePanelPlace(raw),
});
export const parseNewIssueSearch = (raw: Record<string, unknown>): NewIssueSearch => ({ status: text(raw.status) });
