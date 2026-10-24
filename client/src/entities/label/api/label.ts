import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, readJson, type components } from '@/shared/api';

export type Label = components['schemas']['Label'];
const labelBase = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/labels`;
/** The workspace's labels, the system one (결정기록) first, then by name. */
export const labelsQuery = (w: string) => queryOptions({ queryKey: ['workspace', w, 'labels'], queryFn: ({ signal }) => readJson<Label[]>(labelBase(w), signal), retry: false });
export async function createLabel(w: string, body: components['schemas']['CreateLabel']) {
  let location = ''; await command('POST', labelBase(w), body, value => { location = value; });
  const id = location.split('/').at(-1); if (!id) throw new Error('Missing label Location'); return id;
}
export const updateLabel = (w: string, id: string, body: components['schemas']['UpdateLabel']) => command('PATCH', `${labelBase(w)}/${encodeURIComponent(id)}`, body);
export const deleteLabel = (w: string, id: string, expectedVersion: number) => command('DELETE', `${labelBase(w)}/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
/** After a label changes: the list, and the issues that show it. */
export const refreshLabels = (client: QueryClient, w: string) => Promise.allSettled([client.invalidateQueries({ queryKey: ['workspace', w, 'labels'] }), client.invalidateQueries({ queryKey: ['workspace', w] })]);
