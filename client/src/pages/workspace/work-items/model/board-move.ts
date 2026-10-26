// Carrying a card across the board (BoardView): the place it would land, by pointer or by arrow keys, and the move the
// server is asked for when it is put down. A place counts among the lane's other cards, so the carried card itself
// never takes one.

/** A lane as moving sees it: its key, the project column it stands for and its cards in order. */
export type MoveLane<Card extends { id: string }> = { key: string; columnId?: string; cards: readonly Card[] };
/** Where a carried card would land: a lane and its place among that lane's other cards. */
export type BoardSpot = { lane: string; index: number };
/** The arrow keys that walk a carried card: across the lanes and up or down its lane. */
export type StepKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
/** What the server's move takes (MoveWorkItem without the version): the column and the card it goes before or after. */
export type MovePlace = { targetColumnId: string; beforeItemId?: string; afterItemId?: string };

const othersIn = <Card extends { id: string }>(lane: MoveLane<Card>, id: string) => lane.cards.filter(card => card.id !== id);

/** Where the card sits now, or null when no lane holds it. */
export function spotOf<Card extends { id: string }>(lanes: readonly MoveLane<Card>[], id: string): BoardSpot | null {
  for (const lane of lanes) {
    const index = lane.cards.findIndex(card => card.id === id);
    if (index >= 0) return { lane: lane.key, index };
  }
  return null;
}

/**
 * The place one arrow key away: left and right to the neighbouring lane at the same height (or its end when it is
 * shorter), up and down one place in the lane. At an edge the card stays.
 */
export function stepSpot<Card extends { id: string }>(lanes: readonly MoveLane<Card>[], id: string, spot: BoardSpot, key: StepKey): BoardSpot {
  const at = lanes.findIndex(lane => lane.key === spot.lane);
  if (at < 0) return spot;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const room = othersIn(lanes[at]!, id).length;
    return { lane: spot.lane, index: Math.min(room, Math.max(0, spot.index + (key === 'ArrowUp' ? -1 : 1))) };
  }
  const next = lanes[at + (key === 'ArrowLeft' ? -1 : 1)];
  return next ? { lane: next.key, index: Math.min(spot.index, othersIn(next, id).length) } : spot;
}

/**
 * The move for putting the card down at the place: before the card now there, or after the lane's last card. Null when
 * it would stay where it is or the lane is no column (전체's categories).
 */
export function placeOf<Card extends { id: string }>(lanes: readonly MoveLane<Card>[], id: string, spot: BoardSpot): MovePlace | null {
  const lane = lanes.find(candidate => candidate.key === spot.lane);
  if (!lane?.columnId) return null;
  const from = spotOf(lanes, id);
  if (from && from.lane === spot.lane && from.index === spot.index) return null;
  const others = othersIn(lane, id);
  const before = others[spot.index];
  if (before) return { targetColumnId: lane.columnId, beforeItemId: before.id };
  const last = others.at(-1);
  return last ? { targetColumnId: lane.columnId, afterItemId: last.id } : { targetColumnId: lane.columnId };
}

/** The lanes with the card shown at the place instead of where it is: while it is carried, and until a drop is saved. */
export function withCardAt<Card extends { id: string }, Lane extends MoveLane<Card>>(lanes: readonly Lane[], id: string, spot: BoardSpot): Lane[] {
  const card = lanes.flatMap(lane => lane.cards).find(candidate => candidate.id === id);
  if (!card || !lanes.some(lane => lane.key === spot.lane)) return [...lanes];
  return lanes.map(lane => {
    const others = othersIn(lane, id);
    return lane.key === spot.lane ? { ...lane, cards: [...others.slice(0, spot.index), card, ...others.slice(spot.index)] } : { ...lane, cards: others };
  });
}
