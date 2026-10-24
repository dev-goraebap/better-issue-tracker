import type { Project } from '@/entities/demo-sample';

/**
 * What the page shows (D-065): one project, or 전체 (the home) over every active project of the workspace. firstProject
 * is where a new item goes when 전체 names none (the project in view, else the workspace's first).
 */
export type Scope = { workspaceId: string; project?: Project; projectIds: readonly string[]; firstProject?: Project };
