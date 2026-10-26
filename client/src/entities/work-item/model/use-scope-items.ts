import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { itemsQuery, workspaceItemsQuery, type WorkItem } from '../api/work-item';

const PAGE = 100;
/** How many pages a scope loads before it stops and says so: 2,000 work items. */
const MOST_PAGES = 20;

/**
 * Every live work item of a scope (전체, or one project) at once, a page of 100 after another, so the views can filter,
 * order and group them on the page (T-006 stage 3). Past 2,000 the rest is not loaded and isCapped says
 * so; a scope that large needs the server to filter and order instead.
 */
/** The pages useScopeItems reads, for a route to read the first one before the page shows. */
export const scopeItemsQuery = (workspaceId: string, projectId?: string) =>
  (projectId ? itemsQuery(workspaceId, projectId, { size: PAGE }) : workspaceItemsQuery(workspaceId, { size: PAGE }));

export function useScopeItems(workspaceId: string, projectId?: string) {
  const query = useInfiniteQuery(scopeItemsQuery(workspaceId, projectId));
  const pages = query.data?.pages.length ?? 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pages < MOST_PAGES) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, pages]);
  // The same array until the pages change, so what is filtered and laid out from it holds between renders.
  const items: WorkItem[] = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
  return { items, isLoading: query.isPending, isMissing: !query.data, error: query.error, isCapped: !!hasNextPage && pages >= MOST_PAGES, refetch: query.refetch };
}
