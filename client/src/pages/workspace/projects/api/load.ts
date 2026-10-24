import type { QueryClient } from '@tanstack/react-query';
import { projectsQuery } from '@/entities/project';
import type { ProjectsSearch } from '../model/search';

/** What 모든 프로젝트 shows first: the tab's first page for the address's words. */
export const loadProjects = (client: QueryClient, workspaceId: string, search: ProjectsSearch) =>
  client.prefetchInfiniteQuery(projectsQuery(workspaceId, search.status ?? 'active', search.q ?? ''));
