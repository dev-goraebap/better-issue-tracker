import type { QueryClient } from '@tanstack/react-query';
import { documentIdOf, documentQuery } from '@/entities/document';
import { shownVersion, type DocumentSearch } from '../model/search';
import { pageVersionQuery } from './page-version';

/**
 * What a document's page shows first: the document, and for a page the version in its frame. A version named in the
 * address is read beside the document; the latest only once the document says which it is.
 */
export async function loadDocument(client: QueryClient, workspaceId: string, documentRef: string, search: DocumentSearch) {
  const id = documentIdOf(documentRef);
  const asked = search.v ? client.prefetchQuery(pageVersionQuery(workspaceId, id, search.v)) : undefined;
  await client.prefetchQuery(documentQuery(workspaceId, id));
  const document = client.getQueryData(documentQuery(workspaceId, id).queryKey);
  const page = document?.kind === 'page' ? document.page : null;
  if (asked) await asked;
  else if (page) await client.prefetchQuery(pageVersionQuery(workspaceId, id, shownVersion(search, page.latest)));
}
