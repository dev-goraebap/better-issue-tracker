import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type WorkItemType = components['schemas']['WorkItemType'];
/** A type as a work item carries it: enough to draw its mark. */
export type WorkItemTypeRef = components['schemas']['WorkItemTypeRef'];
const typeBase = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/work-item-types`;
/** The workspace's work item types (D-104), in the order its menus show them. */
export const workItemTypesQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'work-item-types'], queryFn: ({ signal }) => readJson<WorkItemType[]>(typeBase(w), signal), retry: false });
export const createWorkItemType = (w: string, body: components['schemas']['CreateWorkItemType']) => createAt(typeBase(w), body);
export const updateWorkItemType = (w: string, id: string, body: components['schemas']['UpdateWorkItemType']) => command('PATCH', `${typeBase(w)}/${encodeURIComponent(id)}`, body);
export const deleteWorkItemType = (w: string, id: string, expectedVersion: number) => command('DELETE', `${typeBase(w)}/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
export const reorderWorkItemTypes = (w: string, types: readonly WorkItemType[]) => command('PUT', `${typeBase(w)}/order`, { types: types.map(type => ({ id: type.id, expectedVersion: type.version })) });
/** After a type changes: the list, and the work items that show it. */
export const refreshWorkItemTypes = (client: QueryClient, w: string) => Promise.allSettled([client.invalidateQueries({ queryKey: ['workspace', w, 'work-item-types'] }), client.invalidateQueries({ queryKey: ['workspace', w] })]);
