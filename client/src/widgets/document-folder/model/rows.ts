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

export const rowsOf = (projects: readonly { project: Project; part?: DocumentPart }[], folders: readonly Folder[], documents: readonly DocumentSummary[]): FolderRow[] => [
  ...projects.map(({ project, part }) => ({ kind: 'project' as const, id: project.id, project, part })),
  ...folders.map(folder => ({ kind: 'folder' as const, id: folder.id, folder })),
  ...documents.map(document => ({ kind: 'document' as const, id: document.id, document })),
];
