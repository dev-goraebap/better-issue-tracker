import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type TimelineEntry = components['schemas']['TimelineEntry'];
export type TargetType = components['schemas']['CreateComment']['targetType'];
type Timeline = components['schemas']['Timeline'];
const base = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}`;
/** The most pages one timeline reads, 200 lines each. */
const PAGES = 10;

/** A target's comments and activity in one list, oldest first (D-078): every page, a work item's being short. */
export const timelineQuery = (w: string, type: TargetType, id: string) => queryOptions({
  queryKey: ['workspace', w, 'timeline', type, id],
  retry: false,
  queryFn: async ({ signal }) => {
    const items: TimelineEntry[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < PAGES; page++) {
      const query = new URLSearchParams({ targetType: type, targetId: id, size: '200', ...(cursor ? { cursor } : {}) });
      const next: Timeline = await readJson<Timeline>(`${base(w)}/timeline?${query}`, signal);
      items.push(...next.items);
      cursor = next.nextCursor;
      if (!cursor) break;
    }
    return items;
  },
});
export const createComment = (w: string, body: components['schemas']['CreateComment']) => createAt(`${base(w)}/comments`, body);
export const updateComment = (w: string, id: string, body: components['schemas']['UpdateComment']) => command('PATCH', `${base(w)}/comments/${encodeURIComponent(id)}`, body);
export const deleteComment = (w: string, id: string, expectedVersion: number) => command('DELETE', `${base(w)}/comments/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
/** After a comment or the target changes: its timeline. */
export const refreshTimeline = (client: QueryClient, w: string, type: TargetType, id: string) => client.invalidateQueries({ queryKey: ['workspace', w, 'timeline', type, id] });
