import { parseTaskSearch, type TaskSearch } from '@/features/work-item-filters';
export type WorkView = 'board' | 'list' | 'backlog' | 'timeline';
export type WorkSearch = TaskSearch & { view: WorkView };
export function parseWorkSearch(raw: Record<string, unknown>): WorkSearch { const view = raw.mode === 'deleted' ? 'list' : raw.view === 'list' || raw.view === 'backlog' || raw.view === 'timeline' ? raw.view : 'board'; const filters = parseTaskSearch(raw); return { ...filters, ...(view === 'board' || view === 'backlog' ? { column: '', order: 'createdAt_desc' as const } : {}), view }; }
