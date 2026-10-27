import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, createAt, readJson, type components } from '@/shared/api';

export type Folder = components['schemas']['Folder'];
export type DocumentSummary = components['schemas']['DocumentSummary'];
export type DocumentDetail = components['schemas']['Document'];
export type FolderContents = components['schemas']['DocumentFolderContents'];
export type DocumentPart = components['schemas']['DocumentPart'];

const base = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}`;
const root = (w: string) => ['workspace', w, 'documents'] as const;
const query = (entries: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) if (value) params.set(key, value);
  return params.toString();
};

/** One folder of a part opened (D-093): a project's (projectId) or the workspace's own, its top when no folder. */
export const contentsQuery = (w: string, projectId?: string, folderId?: string) => queryOptions({
  queryKey: [...root(w), 'contents', projectId ?? null, folderId ?? null],
  queryFn: ({ signal }) => readJson<FolderContents>(`${base(w)}/documents/contents?${query({ projectId, folderId })}`, signal), retry: false,
});
/** The projects' parts in numbers, for their folders at the top of 문서함. */
export const partsQuery = (w: string, projectIds: readonly string[]) => queryOptions({
  queryKey: [...root(w), 'parts', projectIds], enabled: projectIds.length > 0,
  queryFn: ({ signal }) => readJson<DocumentPart[]>(`${base(w)}/documents/parts?${projectIds.map(id => `projectId=${encodeURIComponent(id)}`).join('&')}`, signal), retry: false,
});
export const documentQuery = (w: string, id: string) => queryOptions({
  queryKey: [...root(w), 'document', id], queryFn: ({ signal }) => readJson<DocumentDetail>(`${base(w)}/documents/${encodeURIComponent(id)}`, signal), retry: false,
});
export const createDocument = (w: string, body: components['schemas']['CreateDocument']) => createAt(`${base(w)}/documents`, body);
/** Changes a document's title, body or labels (absent ones kept); a stale expectedVersion is 409. */
export const updateDocument = (w: string, id: string, body: components['schemas']['UpdateDocument']) => command('PATCH', `${base(w)}/documents/${encodeURIComponent(id)}`, body);
/** Deletes a document (soft: it can be restored). */
export const deleteDocument = (w: string, id: string, expectedVersion: number) => command('DELETE', `${base(w)}/documents/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
export const createFolder = (w: string, body: components['schemas']['CreateFolder']) => createAt(`${base(w)}/folders`, body);
export const renameFolder = (w: string, id: string, body: components['schemas']['RenameFolder']) => command('PATCH', `${base(w)}/folders/${encodeURIComponent(id)}`, body);
export const deleteFolder = (w: string, id: string, expectedVersion: number) => command('DELETE', `${base(w)}/folders/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`);
export const refreshDocuments = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: root(w) });

/** Shared order, with a version so another member's move cannot be overwritten. */
export const reorderDocuments = (w: string, body: components['schemas']['ReorderDocuments']) => command('PUT', `${base(w)}/documents/order`, body);
