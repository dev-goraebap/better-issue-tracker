import { useSyncExternalStore } from 'react';
import { PROJECTS, projectsIn, type Project } from './mock';

/**
 * The workspace's projects for the demo's visit: the mock ones and any made with the sidebar's +, kept in memory so the
 * menu, the projects page and the pages agree. A real app creates one through the server and reads the list again.
 */
let version = 0;
const listeners = new Set<() => void>();

/** A workspace's projects, read again whenever one is made. */
export function useProjects(workspaceId?: string): Project[] {
  useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => version);
  return projectsIn(workspaceId);
}

/** Adds an active project the member leads and returns its id. */
export function addProject({ workspaceId, name, key, leadId }: { workspaceId: string; name: string; key: string; leadId: string }): string {
  const id = `p-${Date.now().toString(36)}`;
  PROJECTS.push({ id, workspaceId, key, name, status: 'active', leadId, updatedAt: new Date(Date.UTC(2026, 9, 23, 3)).toISOString() });
  version += 1;
  listeners.forEach(listener => listener());
  return id;
}
