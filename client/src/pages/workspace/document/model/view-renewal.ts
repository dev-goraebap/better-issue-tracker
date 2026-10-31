/** How long before a view address ends a new one is asked for. */
export const RENEW_LEAD_MS = 5 * 60_000;
/** The shortest wait between asks, so an address that is already late is not asked for over and over. */
export const RENEW_FLOOR_MS = 30_000;

/**
 * How long from now until a page's view address, given at issuedAt and working until expiresAt, is asked for again:
 * five minutes before it ends, or halfway through when it lives shorter than ten. A new address reloads the frame, so
 * this is the only time it changes.
 */
export function renewIn(issuedAt: number, expiresAt: number, now: number): number {
  const life = Math.max(0, expiresAt - issuedAt);
  return Math.max(RENEW_FLOOR_MS, expiresAt - Math.min(RENEW_LEAD_MS, life / 2) - now);
}
