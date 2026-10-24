import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Each look's page, card and quiet text, [light, dark] (app/styles/index.css for the plain look, color-themes.css for the
 * colour themes, which keep one side). Kept here as plain values because the page paints them before any style arrives;
 * change them with those files.
 */
const COLORS: Record<string, { body: [string, string]; surface: [string, string]; secondary: [string, string] }> = {
  none: { body: ['#efeff0', '#09090a'], surface: ['#f9f9fa', '#121213'], secondary: ['#5c5c5e', '#8a8f98'] },
  apricot: { body: ['#efe7d6', '#efe7d6'], surface: ['#fbf8f1', '#fbf8f1'], secondary: ['#7a6f5d', '#7a6f5d'] },
  sprout: { body: ['#e3ebdd', '#e3ebdd'], surface: ['#f8faf6', '#f8faf6'], secondary: ['#66756a', '#66756a'] },
  'cotton-candy': { body: ['#f1e3e8', '#f1e3e8'], surface: ['#fdf9fa', '#fdf9fa'], secondary: ['#7d6c72', '#7d6c72'] },
  'dawn-mist': { body: ['#e2e7ee', '#e2e7ee'], surface: ['#f7f9fb', '#f7f9fb'], secondary: ['#667184', '#667184'] },
  'night-sea': { body: ['#141b26', '#141b26'], surface: ['#1b2331', '#1b2331'], secondary: ['#8d99ab', '#8d99ab'] },
  campfire: { body: ['#1d1815', '#1d1815'], surface: ['#25201c', '#25201c'], secondary: ['#a59886', '#a59886'] },
};
/** Where the member's look is kept (shared/lib/appearance). */
const APPEARANCE_KEY = 'bit-appearance';

/**
 * Fills index.html's boot screen, as SandboxHr's: the rocket's first frame, and every look's colours so the page, before
 * its script and styles arrive, already paints the rocket in the reader's own look. The app's first-visit loader
 * (app/layout/FirstVisit) draws the same frame in the same place, so taking over from it changes nothing on screen.
 */
export function bootScreen(): Plugin {
  const rocket = readFileSync(fileURLToPath(new URL('./src/shared/ui/page-loading/rocket-still.svg', import.meta.url)), 'utf8').trim();
  return {
    name: 'boot-screen',
    transformIndexHtml: html => html
      .replace('%BOOT_ROCKET%', rocket)
      .replace('%BOOT_COLORS%', JSON.stringify(COLORS))
      .replace('%BOOT_KEY%', JSON.stringify(APPEARANCE_KEY)),
  };
}
