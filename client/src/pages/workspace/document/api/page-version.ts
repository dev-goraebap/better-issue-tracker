import { queryOptions } from '@tanstack/react-query';
import { readJson, type components } from '@/shared/api';
import { renewIn } from '../model/view-renewal';

export type PageVersion = components['schemas']['PageVersion'];

const expiry = (version: PageVersion) => Date.parse(version.viewExpiresAt);

/**
 * One version of a page with the address its frame opens (about an hour). Kept outside the documents' key, which every
 * document change refreshes: a fresh read is a new address, and a new address reloads the frame. It is read again only
 * shortly before the address ends (renewIn), on a timer or when the window comes back after that.
 */
export const pageVersionQuery = (workspaceId: string, documentId: string, number: number) => queryOptions({
  queryKey: ['workspace', workspaceId, 'page-view', documentId, number],
  queryFn: ({ signal }) => readJson<PageVersion>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/versions/${number}`, signal),
  retry: false,
  staleTime: query => query.state.data ? renewIn(query.state.dataUpdatedAt, expiry(query.state.data), query.state.dataUpdatedAt) : 0,
  refetchInterval: query => query.state.data ? renewIn(query.state.dataUpdatedAt, expiry(query.state.data), Date.now()) : false,
});
