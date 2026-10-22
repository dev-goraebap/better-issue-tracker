import { useSyncExternalStore } from 'react';
export type Appearance = { mode: 'system' | 'light' | 'dark'; layout: 'inset' | 'split' };
const KEY = 'bit-appearance';
const defaults: Appearance = { mode: 'system', layout: 'inset' };
function read(): Appearance {
  try { const data = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>; return { mode: data.mode === 'light' || data.mode === 'dark' ? data.mode : 'system', layout: data.layout === 'split' ? 'split' : 'inset' }; } catch { return defaults; }
}
let current = read(); const listeners = new Set<() => void>();
window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { current = read(); listeners.forEach(listener => listener()); } });
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useAppearance() { return useSyncExternalStore(subscribe, () => current); }
export function setAppearance(next: Partial<Appearance>) { current = { ...current, ...next }; try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* This visit still uses the preference. */ } listeners.forEach(listener => listener()); }
