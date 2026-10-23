/** Which way a list runs by its key: up (asc) or down (desc). */
export type SortDirection = 'asc' | 'desc';

/**
 * A key a list can be ordered by; its kind names its two ways (dates newest or oldest first, text from 가 or 하, a rank
 * from the highest or the lowest).
 */
export type SortKey = { value: string; label: string; kind: 'date' | 'text' | 'rank' };

/**
 * A list's order as Plane keeps it: the key it is ordered by and, apart from it, which way. usual is the list's own
 * order, which 정렬 초기화 goes back to and the address leaves out.
 */
export type ListSort = {
  keys: readonly SortKey[];
  key: string; direction: SortDirection;
  usual: { key: string; direction: SortDirection };
  onChange: (key: string, direction: SortDirection) => void;
};

/** What each way is called for a kind of key. */
export const DIRECTION_LABELS: Record<SortKey['kind'], Record<SortDirection, string>> = {
  date: { desc: '최신 → 오래된', asc: '오래된 → 최신' },
  text: { asc: '가 → 하', desc: '하 → 가' },
  rank: { asc: '높은 → 낮은', desc: '낮은 → 높은' },
};

/** A key's natural way, taken when the key is chosen: dates newest first, text from the start, a rank from the highest. */
export const naturalDirection = (key: SortKey | undefined): SortDirection => (key && key.kind !== 'date' ? 'asc' : 'desc');

/** Whether the list is in its own order. */
export const isUsualSort = (sort: Pick<ListSort, 'key' | 'direction' | 'usual'>) =>
  sort.key === sort.usual.key && sort.direction === sort.usual.direction;

/**
 * The order as the address holds it: the key only when it is not the usual one, the way only when it is not the key's
 * natural one, so the usual order leaves the address bare.
 */
export function sortSearch(keys: readonly SortKey[], usualKey: string, key: string, direction: SortDirection):
  { sort?: string; direction?: SortDirection } {
  const natural = naturalDirection(keys.find(each => each.value === key));
  return { sort: key === usualKey ? undefined : key, direction: direction === natural ? undefined : direction };
}

/** The order an address holds, back: an unknown key is the usual one, a missing way the key's natural one. */
export function sortOf(keys: readonly SortKey[], usualKey: string, raw: { sort?: unknown; direction?: unknown }):
  { key: string; direction: SortDirection } {
  const key = keys.find(each => each.value === raw.sort)?.value ?? usualKey;
  const direction = raw.direction === 'asc' || raw.direction === 'desc' ? raw.direction : naturalDirection(keys.find(each => each.value === key));
  return { key, direction };
}
