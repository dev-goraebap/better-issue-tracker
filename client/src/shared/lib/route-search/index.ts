/**
 * A route's search parser that owns every value in the address. The router lays a route's parsed search over the raw
 * one, so a value the parser leaves out (?status=all) would still reach the screen and its reads as it was written;
 * here each value the parser does not keep is set to nothing instead, and the defaults apply.
 */
export function ownSearch<Parse extends (raw: Record<string, unknown>) => object>(parse: Parse): Parse {
  return ((raw: Record<string, unknown>) => ({ ...Object.fromEntries(Object.keys(raw).map(key => [key, undefined])), ...parse(raw) })) as Parse;
}

/** A search value when it is one of the allowed ones, else nothing. */
export const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  (allowed.includes(value as T) ? value as T : undefined);

/** Whether a search value is an id: ten letters and digits, the first a letter (D-083). Ids are case-sensitive. */
export const isId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z][A-Za-z0-9]{9}$/.test(value);

export { findingOf, useSearchScreen } from './search-screen';
