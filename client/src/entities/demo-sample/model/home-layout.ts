import { useSyncExternalStore } from 'react';

/**
 * The widgets a workspace's home can show and a member's arrangement of them, per workspace (D-064): their order and
 * the ones shown. Kept in this browser for the demo; the real app keeps it with the member's preferences.
 */
export type HomeWidget = 'contributions' | 'activity' | 'mine' | 'upcoming' | 'decisions';
export const HOME_WIDGETS: readonly { key: HomeWidget; label: string; icon: string }[] = [
  { key: 'contributions', label: '활동 잔디', icon: 'grid' },
  { key: 'activity', label: '최근 활동', icon: 'clock' },
  { key: 'mine', label: '내 작업', icon: 'person' },
  { key: 'upcoming', label: '다가오는 마감', icon: 'calendar' },
  { key: 'decisions', label: '최근 결정기록', icon: 'decision' },
];
export type HomeLayout = { order: HomeWidget[]; shown: HomeWidget[] };
const KEYS = HOME_WIDGETS.map(widget => widget.key);
/** What a home shows before the member arranges it: the contributions, the activity and their own work. */
export const USUAL_HOME: HomeLayout = { order: KEYS, shown: ['contributions', 'activity', 'mine'] };
const KEY = 'bit-demo-home-layout';

function readAll(): Record<string, HomeLayout> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, HomeLayout>; } catch { return {}; }
}
/** A stored layout made whole: every widget once in the order, unknown ones dropped. */
function tidy(layout?: Partial<HomeLayout>): HomeLayout {
  const order = (layout?.order ?? []).filter((key, index, all) => KEYS.includes(key) && all.indexOf(key) === index);
  return { order: [...order, ...KEYS.filter(key => !order.includes(key))], shown: (layout?.shown ?? []).filter(key => KEYS.includes(key)) };
}
let all = readAll();
const listeners = new Set<() => void>();
const cache = new Map<string, HomeLayout>();
const layoutOf = (workspaceId: string) => {
  if (!cache.has(workspaceId)) cache.set(workspaceId, all[workspaceId] ? tidy(all[workspaceId]) : USUAL_HOME);
  return cache.get(workspaceId)!;
};

export function useHomeLayout(workspaceId: string) {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => layoutOf(workspaceId));
}

export function setHomeLayout(workspaceId: string, layout: HomeLayout) {
  const next = tidy(layout);
  all = { ...all, [workspaceId]: next };
  cache.set(workspaceId, next);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* This visit still uses the layout. */ }
  listeners.forEach(listener => listener());
}
