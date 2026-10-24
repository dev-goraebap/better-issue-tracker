import { oneOf } from '@/shared/lib/route-search';

/** 모든 프로젝트's address: the tab (진행 중 left out) and the search words, each left out at its default. */
export type ProjectsSearch = { status?: 'archived' | 'deleted'; q?: string };
export const parseProjectsSearch = (raw: Record<string, unknown>): ProjectsSearch => ({
  status: oneOf(raw.status, ['archived', 'deleted'] as const), q: typeof raw.q === 'string' && raw.q.trim() ? raw.q : undefined,
});
