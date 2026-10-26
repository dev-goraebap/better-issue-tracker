import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { rememberPictures } from '@/shared/lib/person-pictures';
import { memberPagesQuery, workspacePagesQuery } from '../api/workspace';

type PagedQuery<T> = {
  data?: { pages: { items: T[] }[] }; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => Promise<unknown>;
  isPending: boolean; error: unknown; refetch: () => Promise<unknown>;
};

/** Reads every page of a paged list, one after another, and answers them as one list. */
function useAllPages<T>(query: PagedQuery<T>) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, data } = query;
  useEffect(() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  return { items, hasData: !!data, isPending: query.isPending, error: query.error, refetch: query.refetch };
}

/**
 * All the workspace's members (the server pages them; counts, owners and pickers need them all). Their pictures are
 * remembered as they arrive, so every avatar beside a name shows them (BIT-30).
 */
export function useMembers(workspaceId: string) {
  const members = useAllPages(useInfiniteQuery(memberPagesQuery(workspaceId)));
  useEffect(() => { rememberPictures(members.items.map(member => [member.userId, member.avatar] as const)); }, [members.items]);
  return members;
}
/** All the member's workspaces. */
export const useAllWorkspaces = () => useAllPages(useInfiniteQuery(workspacePagesQuery()));
