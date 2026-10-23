import { useSyncExternalStore } from 'react';
/**
 * The member's look for this browser: the mode (system, light or dark), a colour theme over it (none for the plain
 * stone theme; app/styles/color-themes.css paints each, shared/config LOOK_CHOICES names them) and the layout.
 */
export type ColorTheme = 'none' | 'apricot' | 'sprout' | 'cotton-candy' | 'dawn-mist' | 'night-sea' | 'campfire';
export type Appearance = { mode: 'system' | 'light' | 'dark'; color: ColorTheme; layout: 'inset' | 'split' };
const KEY = 'bit-appearance';
const COLORS: readonly ColorTheme[] = ['none', 'apricot', 'sprout', 'cotton-candy', 'dawn-mist', 'night-sea', 'campfire'];
const defaults: Appearance = { mode: 'system', color: 'none', layout: 'inset' };
function read(): Appearance {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>;
    return { mode: data.mode === 'light' || data.mode === 'dark' ? data.mode : 'system', color: COLORS.includes(data.color as ColorTheme) ? data.color as ColorTheme : 'none', layout: data.layout === 'split' ? 'split' : 'inset' };
  } catch { return defaults; }
}
let current = read(); const listeners = new Set<() => void>();
window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { current = read(); listeners.forEach(listener => listener()); } });
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useAppearance() { return useSyncExternalStore(subscribe, () => current); }
export function setAppearance(next: Partial<Appearance>) { current = { ...current, ...next }; try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* This visit still uses the preference. */ } listeners.forEach(listener => listener()); }
