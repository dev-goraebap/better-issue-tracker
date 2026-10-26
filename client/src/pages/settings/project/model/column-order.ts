// Ordering a project's board columns by hand (BoardSettings): where a carried column lands among the others, by
// pointer or by Alt + arrow. A place counts among the other columns, so the carried one never takes one.

/** The order with the column taken out and put back at the place among the others (kept in range). */
export function placeAt(order: readonly string[], id: string, index: number): string[] {
  const others = order.filter(each => each !== id);
  if (others.length === order.length) return [...order];
  const at = Math.min(others.length, Math.max(0, index));
  return [...others.slice(0, at), id, ...others.slice(at)];
}

/** The order with the column one place up (-1) or down (1); at an end it stays. */
export function stepBy(order: readonly string[], id: string, by: -1 | 1): string[] {
  const at = order.indexOf(id);
  return at < 0 ? [...order] : placeAt(order, id, at + by);
}

/**
 * The place a carried row of the given height would take, its middle at `middle`: among the other rows laid out as if
 * it were gone (each `top` and `height` measured in the list, the carried row's own place `from` closed up), the count
 * whose middles lie above. Measuring without the carried row keeps the place from flickering as the rows make way.
 */
export function placeFor(rows: readonly { top: number; height: number }[], from: number, middle: number): number {
  const gap = rows[from]?.height ?? 0;
  return rows.filter((row, index) => index !== from && (index > from ? row.top - gap : row.top) + row.height / 2 < middle).length;
}
