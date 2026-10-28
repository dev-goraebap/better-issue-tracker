import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, isNotFound, readJson, type components } from '@/shared/api';

export type Relation = components['schemas']['RelationRef'];
export type RelationType = 'work_item' | 'document';
export type Candidate = { type: RelationType; id: string; projectId?: string | null; reference?: string | null; title: string };
const base = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}`;
export const relationsQuery = (w: string, type: RelationType, id: string) => queryOptions({
  queryKey: ['workspace', w, 'relations', type, id], retry: false,
  queryFn: ({ signal }) => readJson<Relation[]>(`${base(w)}/relations?${new URLSearchParams({ type, id })}`, signal),
});
export const connectTargets = (w: string, body: components['schemas']['Connect']) => command('POST', `${base(w)}/relations`, body);
export const unlinkTargets = (w: string, id: string) => command('DELETE', `${base(w)}/relations/${encodeURIComponent(id)}`);
/** Makes a subtask under a work item, of a type that may sit there (D-104); none is the workspace's default. */
export const createChild = (w: string, p: string, id: string, title: string, typeId?: string) =>
  createAt(`${base(w)}/projects/${encodeURIComponent(p)}/work-items/${encodeURIComponent(id)}/children`, { title, ...(typeId ? { typeId } : {}) });
export const refreshRelations = (client: QueryClient, w: string) => Promise.allSettled([
  client.invalidateQueries({ queryKey: ['workspace', w, 'relations'] }),
  client.invalidateQueries({ queryKey: ['workspace', w, 'timeline'] }),
  client.invalidateQueries({ queryKey: ['workspace', w, 'documents'] }),
  client.invalidateQueries({ queryKey: ['workspace', w, 'items'] }),
  client.invalidateQueries({ queryKey: ['workspace', w, 'project'] }),
]);
export async function searchTargets(w: string, type: RelationType, query: string, cursor: string | undefined, signal: AbortSignal): Promise<{ items: Candidate[]; nextCursor?: string | null }> {
  const params = new URLSearchParams({ ...(type === 'document' ? { query, limit: '30' } : { q: query, size: '30' }), ...(cursor ? { cursor } : {}) });
  if (type === 'document') {
    const page = await readJson<components['schemas']['DocumentPage']>(`${base(w)}/documents?${params}`, signal);
    return { items: page.items.map(item => ({ ...item, type })), nextCursor: page.nextCursor };
  }
  if (/^[A-Z0-9]{2,10}-[1-9]\d*$/i.test(query.trim())) {
    try {
      const item = await readJson<components['schemas']['WorkItem']>(`${base(w)}/work-items/by-ref/${encodeURIComponent(query.trim().toUpperCase())}`, signal);
      return { items: [{ type, id: item.id, projectId: item.projectId, reference: item.key, title: item.title }] };
    } catch (failure) { if (isNotFound(failure)) return { items: [] }; throw failure; }
  }
  const page = await readJson<components['schemas']['WorkItems']>(`${base(w)}/work-items?${params}`, signal);
  return { items: page.items.map(item => ({ ...item, type, reference: item.key })), nextCursor: page.nextCursor };
}
export const targetHref = (w: string, item: Candidate) => item.type === 'document'
  ? `/workspaces/${w}/documents/${item.id}` : item.projectId ? `/workspaces/${w}/projects/${item.projectId}/work-items/${item.id}` : `/workspaces/${w}/work-items/id/${item.id}`;
