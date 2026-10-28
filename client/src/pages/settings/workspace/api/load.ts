import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { memberPagesQuery } from '@/entities/workspace';
import { workItemTypesQuery } from '@/entities/work-item-type';

/** What a workspace settings page shows first: its labels (라벨), its work item types (업무 유형), or its members (일반, 역할). */
export const loadWorkspaceSettings = (client: QueryClient, workspaceId: string, section: string) =>
  (section === 'labels' ? client.prefetchQuery(labelsQuery(workspaceId))
    : section === 'types' ? client.prefetchQuery(workItemTypesQuery(workspaceId))
    : client.prefetchInfiniteQuery(memberPagesQuery(workspaceId)));
