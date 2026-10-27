import { agoText } from '@/shared/lib/date-text';
import { MoreMenu } from '@astryxdesign/core';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon } from '@/shared/ui';
import { DocumentLink, FolderLink, type DocumentSummary, type Folder } from '@/entities/document';
import { LabelTokens } from '@/entities/work-item';
import type { Label } from '@/entities/label';
import styles from './folder.module.css';

/** What a work item list says of a document's links: its first work item's key, and how many more. */
const linked = (document: DocumentSummary) => document.workItems.length === 0 ? ''
  : `${document.workItems[0]!.reference}${document.workItems.length > 1 ? ` 외 ${document.workItems.length - 1}` : ''}`;

/**
 * A folder's contents as a list (BIT-41, the default): its folders first, then its documents, each a 44px row with its
 * labels, the work items it is linked to and when it last changed. A folder's row ends with its menu (이름 바꾸기, 지우기)
 * for someone who may write.
 */
export function FolderRows({ workspaceId, projectId, folders, documents, labels, onRename, onDelete }: {
  workspaceId: string; projectId: string | null; folders: Folder[]; documents: DocumentSummary[]; labels: Label[];
  onRename?: (folder: Folder) => void; onDelete?: (folder: Folder) => void;
}) {
  const labelsOf = (document: DocumentSummary) => labels.filter(label => document.labelIds.includes(label.id));
  return <ItemList label="폴더 내용">
    {folders.map(folder => <ItemRow key={folder.id} lead={<NavIcon name="documents" />}
      title={<FolderLink className={`${ITEM_ROW_LINK} ${styles.link}`} workspaceId={workspaceId} projectId={projectId} folderId={folder.id}>{folder.name}</FolderLink>}
      meta={<><ItemMeta width="10rem">문서 {folder.documentCount}</ItemMeta><ItemMeta width="8rem" /><ItemMeta width="5rem" align="end">{agoText(folder.updatedAt)}</ItemMeta></>}
      end={onRename && onDelete ? <MoreMenu label={`${folder.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[
        { label: '이름 바꾸기', icon: <NavIcon name="edit" />, onClick: () => onRename(folder) },
        { label: '지우기', icon: <NavIcon name="delete" />, onClick: () => onDelete(folder) },
      ]} /> : undefined} />)}
    {documents.map(document => <ItemRow key={document.id} lead={<NavIcon name="document" />}
      title={<DocumentLink className={`${ITEM_ROW_LINK} ${styles.link}`} workspaceId={workspaceId} document={document}>{document.title}</DocumentLink>}
      meta={<><ItemMeta width="10rem"><LabelTokens labels={labelsOf(document)} /></ItemMeta><ItemMeta width="8rem">{linked(document)}</ItemMeta>
        <ItemMeta width="5rem" align="end">{agoText(document.updatedAt)}</ItemMeta></>} />)}
  </ItemList>;
}
