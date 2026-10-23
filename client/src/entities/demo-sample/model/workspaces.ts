import { useSyncExternalStore } from 'react';
import { WORKSPACES, type Workspace } from './mock';

/**
 * The member's workspaces for the demo's visit: the mock ones and any made with the create dialog, kept in memory so
 * the switcher, the trail and the pages agree. A real app creates one through the server and reads the list again.
 */
let list: readonly Workspace[] = [...WORKSPACES];
const listeners = new Set<() => void>();

export function useWorkspaces() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => list);
}

/** Adds a workspace the member owns and returns its id. */
export function addWorkspace({ name, description, logo }: { name: string; description?: string; logo?: string }): string {
  const id = `ws-${Date.now().toString(36)}`;
  const workspace: Workspace = { id, name, description, logo, myRole: 'owner', projects: 0, members: 1, tone: list.length % 6 };
  WORKSPACES.push(workspace);
  list = [...list, workspace];
  listeners.forEach(listener => listener());
  return id;
}
