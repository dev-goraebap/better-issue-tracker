import { useSyncExternalStore } from 'react';
import { ISSUE_MENU, type IssueEntry, type IssueMenuKey } from './navigation';

/**
 * A member's order of the issue menus and the ones hidden (never 작업), per workspace (D-063): theirs alone, kept in this
 * browser for the demo; the real app keeps it with the member's preferences.
 */
export type IssueMenuPrefs = { order: IssueMenuKey[]; hidden: IssueMenuKey[] };
const KEY = 'bit-demo-issue-menu';
const KEYS = ISSUE_MENU.map(entry => entry.key);
const usual: IssueMenuPrefs = { order: KEYS, hidden: [] };

function readAll(): Record<string, IssueMenuPrefs> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, IssueMenuPrefs>; } catch { return {}; }
}
/** A stored order made whole: every menu once, unknown ones dropped, 작업 never hidden. */
function tidy(prefs?: Partial<IssueMenuPrefs>): IssueMenuPrefs {
  const order = (prefs?.order ?? []).filter((key, index, all) => KEYS.includes(key) && all.indexOf(key) === index);
  return { order: [...order, ...KEYS.filter(key => !order.includes(key))], hidden: (prefs?.hidden ?? []).filter(key => KEYS.includes(key) && key !== 'work') };
}
let all = readAll();
const listeners = new Set<() => void>();
const cache = new Map<string, IssueMenuPrefs>();
const prefsOf = (workspaceId: string) => {
  if (!cache.has(workspaceId)) cache.set(workspaceId, all[workspaceId] ? tidy(all[workspaceId]) : usual);
  return cache.get(workspaceId)!;
};

/** The menus a member sees, in their order. */
export const shownIssueMenu = (prefs: IssueMenuPrefs): IssueEntry[] =>
  prefs.order.filter(key => !prefs.hidden.includes(key)).map(key => ISSUE_MENU.find(entry => entry.key === key)!);
/** Where a workspace opens: the member's first shown issue menu. */
export const firstIssuePath = (workspaceId: string) => shownIssueMenu(prefsOf(workspaceId))[0]!.path;

export function useIssueMenu(workspaceId: string) {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => prefsOf(workspaceId));
}

export function setIssueMenu(workspaceId: string, prefs: IssueMenuPrefs) {
  const next = tidy(prefs);
  all = { ...all, [workspaceId]: next };
  cache.set(workspaceId, next);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* This visit still uses the order. */ }
  listeners.forEach(listener => listener());
}
