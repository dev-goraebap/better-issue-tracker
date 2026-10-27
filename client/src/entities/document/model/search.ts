import { isId } from '@/shared/lib/route-search';

export type FolderSearch = { folder?: string; q?: string; kind?: 'folder' | 'document'; label?: string; sort?: 'name' | 'updated'; direction?: 'asc' | 'desc' };
export type NewDocumentSearch = { project?: string; folder?: string };

/** A folder page's address: the folder opened (?folder=), else the part's top. */
export const parseFolderSearch = (raw: Record<string, unknown>): FolderSearch => ({
  folder: isId(raw.folder) ? raw.folder : undefined,
  q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) || undefined : undefined,
  kind: raw.kind === 'folder' || raw.kind === 'document' ? raw.kind : undefined,
  label: isId(raw.label) ? raw.label : undefined,
  sort: raw.sort === 'name' || raw.sort === 'updated' ? raw.sort : undefined,
  direction: (raw.sort === 'name' || raw.sort === 'updated') && (raw.direction === 'asc' || raw.direction === 'desc') ? raw.direction : undefined,
});
/** 새 문서's address: the part (?project=, else the workspace's own) and the folder it goes in. */
export const parseNewDocumentSearch = (raw: Record<string, unknown>): NewDocumentSearch =>
  ({ project: isId(raw.project) ? raw.project : undefined, folder: isId(raw.folder) ? raw.folder : undefined });
