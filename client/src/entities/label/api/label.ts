import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type Label = components['schemas']['Label'];
const labelBase = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/labels`;
/** The workspace's labels, the system one (결정기록) first, then by name. */
export const labelsQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'labels'], queryFn: ({ signal }) => readJson<Label[]>(labelBase(w), signal), retry: false });
export const createLabel = (w: string, body: components['schemas']['CreateLabel']) => createAt(labelBase(w), body);
export const updateLabel = (w: string, id: string, body: components['schemas']['UpdateLabel']) => command('PATCH', `${labelBase(w)}/${encodeURIComponent(id)}`, body);
export const deleteLabel = (w: string, id: string, expectedVersion: number) => command('DELETE', `${labelBase(w)}/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
/** After a label changes: the list, and the work items that show it. */
export const refreshLabels = (client: QueryClient, w: string) => Promise.allSettled([client.invalidateQueries({ queryKey: ['workspace', w, 'labels'] }), client.invalidateQueries({ queryKey: ['workspace', w] })]);

export const reorderLabels = (workspace: string, labels: readonly Label[]) => command('PUT', `${labelBase(workspace)}/order`, { labels: labels.map(label => ({ id: label.id, expectedVersion: label.version })) });
