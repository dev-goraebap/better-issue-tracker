import type { BoardColumn, Project } from '@/entities/project';

/**
 * What the page shows (D-065): one project, or 전체 (the home) over every active project of the workspace. firstProject
 * is where a new work item goes when 전체 names none; columns are the project's statuses (a project's board lanes and the
 * names its rows give a status), none in 전체, whose board groups by category.
 */
export type Scope = {
  workspaceId: string; project?: Project; projects: readonly Project[]; firstProject?: Project; columns: readonly BoardColumn[];
  me: string; role?: string; canWrite: boolean;
};
