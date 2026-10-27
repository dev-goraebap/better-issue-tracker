import { isId } from '@/shared/lib/route-search';

export type FolderSearch = { folder?: string };
export type NewDocumentSearch = { project?: string; folder?: string };

/** A folder page's address: the folder opened (?folder=), else the part's top. */
export const parseFolderSearch = (raw: Record<string, unknown>): FolderSearch => ({ folder: isId(raw.folder) ? raw.folder : undefined });
/** 새 문서's address: the part (?project=, else the workspace's own) and the folder it goes in. */
export const parseNewDocumentSearch = (raw: Record<string, unknown>): NewDocumentSearch =>
  ({ project: isId(raw.project) ? raw.project : undefined, folder: isId(raw.folder) ? raw.folder : undefined });
