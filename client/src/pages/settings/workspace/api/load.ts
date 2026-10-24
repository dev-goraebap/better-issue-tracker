import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { memberPagesQuery } from '@/entities/workspace';

/** What a workspace settings page shows first: its labels (라벨), or its members (일반, 역할). */
export const loadWorkspaceSettings = (client: QueryClient, workspaceId: string, section: string) =>
  (section === 'labels' ? client.prefetchQuery(labelsQuery(workspaceId)) : client.prefetchInfiniteQuery(memberPagesQuery(workspaceId)));
