import type { QueryClient } from '@tanstack/react-query';
import { memberPagesQuery } from '@/entities/workspace';
import { projectMembershipsQuery } from '@/entities/project';
export const loadProjectMembers = (client: QueryClient, w: string) => Promise.all([client.prefetchInfiniteQuery(memberPagesQuery(w)), client.prefetchQuery(projectMembershipsQuery(w))]);
