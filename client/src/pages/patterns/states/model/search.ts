import { oneOf } from '@/shared/lib/route-search';

/** The states page's address: the state shown (빈 목록 when left out). */
export type StatesSearch = { state?: 'empty' | 'search' | 'not-found' | 'error' | 'loading' };
export const parseStatesSearch = (raw: Record<string, unknown>): StatesSearch => ({ state: oneOf(raw.state, ['empty', 'search', 'not-found', 'error', 'loading'] as const) });
