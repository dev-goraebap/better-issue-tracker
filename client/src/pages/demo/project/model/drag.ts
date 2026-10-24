// Dragging's arithmetic from SandboxHr's calendar (team-calendar/model/drag), without saving or making new events.

/** Dragging moves and stretches by a quarter of an hour. */
export const SNAP_MINUTES = 15;
/** A press that moves less than this many pixels is a click, not a drag. */
export const DRAG_THRESHOLD = 4;
const DAY_MINUTES = 24 * 60;

export const snap = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** A wall-clock moment as a number to add to, read as UTC so no clock change gets in the way. */
const momentOf = (local: string) => Date.parse(`${local.slice(0, 16)}:00Z`);
const localOf = (moment: number) => `${new Date(moment).toISOString().slice(0, 16)}:00`;

/** The moment so many minutes into the day, midnight at its end being the next day's start. */
export const atMinutes = (day: string, minutes: number) => localOf(Date.parse(`${day}T00:00:00Z`) + minutes * 60_000);

/** The event's start and end moved by whole days, keeping how long it is; an all-day event's end is the midnight after its last day. */
export function shifted(event: { start: string; end: string }, days: number) {
  const by = days * DAY_MINUTES * 60_000;
  return { start: localOf(momentOf(event.start) + by), end: localOf(momentOf(event.end) + by) };
}

/** Where a timed block lands in its day when moved by minutes: whole, so it never runs past midnight or before it. */
export const movedWithin = (start: number, end: number, by: number) => {
  const length = end - start;
  const next = clamp(snap(start + by), 0, DAY_MINUTES - length);
  return { start: next, end: next + length };
};

/** The new end of a block stretched by minutes: at least a quarter of an hour, at most midnight. */
export const stretched = (start: number, end: number, by: number) => clamp(snap(end + by), start + SNAP_MINUTES, DAY_MINUTES);
