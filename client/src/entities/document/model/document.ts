/**
 * A document's address segment (D-093): its title's words, a dash, then its id. The title is only for the reader; the
 * last ten characters (the id, D-083) are what open it, so a renamed document's old address still does.
 */
export function documentSlug(document: { id: string; title: string }) {
  const words = document.title.trim().replace(/[\s/?#%\\]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return words ? `${words}-${document.id}` : document.id;
}

/** A document's whole address: /workspaces/…/documents/<제목>-<id>. */
export const documentHref = (workspaceId: string, document: { id: string; title: string }) =>
  `/workspaces/${workspaceId}/documents/${encodeURIComponent(documentSlug(document))}`;

/** The id at the end of a document's address segment. */
export const documentIdOf = (reference: string) => decodeURIComponent(reference).slice(-10);

/** A part's folder page: the project's 문서, or 문서함 for the workspace's own, at a folder when given. */
export function folderHref(workspaceId: string, projectId: string | null, folderId?: string | null) {
  const page = projectId ? `/workspaces/${workspaceId}/projects/${projectId}/documents` : `/workspaces/${workspaceId}/documents`;
  return folderId ? `${page}?folder=${encodeURIComponent(folderId)}` : page;
}
