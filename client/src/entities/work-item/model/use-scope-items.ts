import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { itemsQuery, workspaceItemsQuery, type WorkItem } from '../api/work-item';

const PAGE = 100;
/** How many pages a scope loads before it stops and says so: 2,000 issues. */
const MOST_PAGES = 20;

/**
 * Every live issue of a scope (전체, or one project) at once, a page of 100 after another, so the views can filter,
 * order and group them on the page as the demo did (T-006 stage 3). Past 2,000 the rest is not loaded and isCapped says
 * so; a scope that large needs the server to filter and order instead.
 */
export function useScopeItems(workspaceId: string, projectId?: string) {
  const query = useInfiniteQuery(projectId ? itemsQuery(workspaceId, projectId, { size: PAGE }) : workspaceItemsQuery(workspaceId, { size: PAGE }));
  const pages = query.data?.pages.length ?? 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pages < MOST_PAGES) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, pages]);
  const items: WorkItem[] = query.data?.pages.flatMap(page => page.items) ?? [];
  return { items, isLoading: query.isPending, isMissing: !query.data, error: query.error, isCapped: !!hasNextPage && pages >= MOST_PAGES, refetch: query.refetch };
}
