import { queryOptions } from '@tanstack/react-query';
import { command, readJson, type components } from '@/shared/api';
import { PROJECT_MENU, WORKSPACE_MENU } from '@/shared/config';

export type NavigationEntry = components['schemas']['NavigationEntry'];
export type Navigation = components['schemas']['ScopeNavigation'];
export const navigationQuery = (w: string, p?: string) => queryOptions({ queryKey: ['workspace', w, 'navigation', p ?? 'workspace'], retry: false,
  queryFn: ({ signal }) => readJson<Navigation>(`/api/v1/workspaces/${w}/navigation/${p ?? 'workspace'}`, signal) });
export const saveNavigation = (w: string, p: string | undefined, body: { expectedVersion: number; entries: NavigationEntry[] }) => command('PUT', `/api/v1/workspaces/${w}/navigation/${p ?? 'workspace'}`, body);
export const favoritesQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'project-favorites'], retry: false,
  queryFn: ({ signal }) => readJson<string[]>(`/api/v1/workspaces/${w}/project-favorites`, signal) });
export const setFavorite = (w: string, p: string, favorite: boolean) => command('PUT', `/api/v1/workspaces/${w}/project-favorites/${p}`, { favorite });
export function scopeMenu(entries: NavigationEntry[] | undefined, project: boolean) {
  const base = project ? PROJECT_MENU : WORKSPACE_MENU;
  if (!entries) return [...base];
  return [...entries.flatMap(entry => { const item = base.find(each => each.path === `/${entry.key}`); return item ? [{ ...item, label: entry.label }] : []; }), ...base.filter(item => !entries.some(entry => `/${entry.key}` === item.path))];
}
