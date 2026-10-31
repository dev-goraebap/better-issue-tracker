import { manualMark, type Manual, type ManualSearch } from './manual';

/** Origin is a list projection, never part of the manual body or its portable bundle. */
export type ManualListEntry = { key: string; manual: Manual; projectId?: string; scopeName: string; isLocal: boolean };
export const manualModifiedAt = (manual: Manual) => [manual.updatedAt ?? '', ...manual.pages.map(page => page.updatedAt)].filter(Boolean).sort().at(-1) ?? '';
export function selectManuals(entries: readonly ManualListEntry[], search: ManualSearch): ManualListEntry[] {
  const words = search.q?.trim().toLocaleLowerCase();
  const direction = search.dir ?? (search.sort === 'title' ? 'asc' : 'desc');
  return entries.filter(entry => (!words || `${entry.manual.title} ${entry.manual.description}`.toLocaleLowerCase().includes(words)) &&
    (!search.scope || (entry.projectId ?? 'workspace') === search.scope) && (!search.color || manualMark(entry.manual).color.toLowerCase() === search.color.toLowerCase()))
    .sort((a, b) => {
      if (search.sort === 'title') return a.manual.title.localeCompare(b.manual.title, 'ko') * (direction === 'asc' ? 1 : -1) || a.key.localeCompare(b.key);
      const first = manualModifiedAt(a.manual); const second = manualModifiedAt(b.manual);
      // Older empty manuals have no trustworthy timestamp; keep them last in either direction.
      if (!first || !second) return first ? -1 : second ? 1 : a.key.localeCompare(b.key);
      return first.localeCompare(second) * (direction === 'asc' ? 1 : -1) || a.key.localeCompare(b.key);
    });
}
