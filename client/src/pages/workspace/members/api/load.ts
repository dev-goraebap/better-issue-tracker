import type { QueryClient } from '@tanstack/react-query';
import { memberPagesQuery } from '@/entities/workspace';

/** What 구성원 shows first: the first page of members. */
export const loadMembers = (client: QueryClient, workspaceId: string) => client.prefetchInfiniteQuery(memberPagesQuery(workspaceId));
