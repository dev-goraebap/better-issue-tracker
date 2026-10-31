export type DocumentSearch = { v?: number };

/** A document's address keeps the page version shown (?v=2), so a reload or a shared link opens the same one; none is the latest. */
export const parseDocumentSearch = (raw: Record<string, unknown>): DocumentSearch => {
  const value = typeof raw.v === 'string' && /^\d{1,9}$/.test(raw.v) ? Number(raw.v) : raw.v;
  return { v: typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : undefined };
};

/** The version a page shows: the one its address asks for, else its latest. */
export const shownVersion = (search: DocumentSearch, latest: number) => search.v ?? latest;
