import type { DocumentPart, DocumentSummary, Folder } from '@/entities/document';
import type { Project } from '@/entities/project';

/**
 * A row of a folder's list (BIT-41): at 문서함's top each project's own folder (D-093) comes first, then folders, then
 * documents.
 */
export type FolderRow =
  | { kind: 'project'; id: string; project: Project; part?: DocumentPart }
  | { kind: 'folder'; id: string; folder: Folder }
  | { kind: 'document'; id: string; document: DocumentSummary };

export type ProjectFolder = { project: Project; part?: DocumentPart };

export const rowsOf = (projects: readonly ProjectFolder[], folders: readonly Folder[], documents: readonly DocumentSummary[]): FolderRow[] => [
  ...projects.map(({ project, part }) => ({ kind: 'project' as const, id: project.id, project, part })),
  ...folders.map(folder => ({ kind: 'folder' as const, id: folder.id, folder })),
  ...documents.map(document => ({ kind: 'document' as const, id: document.id, document })),
];

export const rowKey = (row: FolderRow) => `${row.kind}:${row.id}`;
export const rowName = (row: FolderRow) => row.kind === 'project' ? row.project.name : row.kind === 'folder' ? row.folder.name : row.document.title;
const changed = (row: FolderRow) => row.kind === 'project' ? row.project.updatedAt : row.kind === 'folder' ? row.folder.updatedAt : row.document.updatedAt;

/** A shared manual order mixes types; new rows follow in their stable default order. */
export function orderedRows(rows: readonly FolderRow[], order: readonly string[], sort?: 'name' | 'updated', direction?: 'asc' | 'desc'): FolderRow[] {
  const ranks = new Map(order.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => sort === 'name'
    ? (direction === 'desc' ? -1 : 1) * rowName(a).localeCompare(rowName(b), 'ko', { numeric: true })
    : sort === 'updated' ? (direction === 'asc' ? -1 : 1) * changed(b).localeCompare(changed(a)) || rowName(a).localeCompare(rowName(b), 'ko')
      : (ranks.get(rowKey(a)) ?? order.length) - (ranks.get(rowKey(b)) ?? order.length));
}
