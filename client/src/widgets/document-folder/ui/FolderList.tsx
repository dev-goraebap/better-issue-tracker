import type { CSSProperties, ReactNode } from 'react';
import { useToast } from '@astryxdesign/core';
import { authError } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { rowReorderStyles as moving, useRowReorder } from '@/shared/lib/row-reorder';
import { MoreMenu, NavIcon } from '@/shared/ui';
import { DocumentLink, FolderLink, type Folder } from '@/entities/document';
import { ProjectMark } from '@/entities/project';
import { LabelTokens } from '@/entities/work-item';
import type { Label } from '@/entities/label';
import { rowKey, rowName, type FolderRow } from '../model/rows';
import styles from './folder.module.css';

/** Mixed rows share a name and a changed date, while each kind keeps only its own metadata (BIT-57). */
export function FolderList({ workspaceId, projectId, rows, labels, foot, onRename, onDelete, onOrder }: {
  workspaceId: string; projectId: string | null; rows: FolderRow[]; labels: Label[]; foot?: ReactNode;
  onRename?: (folder: Folder) => void; onDelete?: (folder: Folder) => void; onOrder?: (order: string[]) => Promise<void>;
}) {
  const toast = useToast();
  const reorder = useRowReorder(rows.map(row => ({ id: rowKey(row), name: rowName(row) })),
    { word: '항목', object: '항목을', topic: '항목은' }, moving.ghost,
    async order => { await onOrder?.(order); }, failure => toast({ body: authError(failure) }));
  const shown = reorder.order.flatMap(id => rows.filter(row => rowKey(row) === id));
  const name = (row: FolderRow) => {
    switch (row.kind) {
      case 'project': return <><ProjectMark project={row.project} /><FolderLink className={styles.rowLink} workspaceId={workspaceId} projectId={row.project.id}>{row.project.name}</FolderLink>
        <span className={styles.partMark} title="프로젝트 폴더"><NavIcon name="link" /></span></>;
      case 'folder': return <><span className={styles.icon} style={row.folder.color ? { color: row.folder.color } : undefined}><NavIcon name="documents" /></span>
        <FolderLink className={styles.rowLink} workspaceId={workspaceId} projectId={projectId} folderId={row.folder.id}>{row.folder.name}</FolderLink></>;
      case 'document': return <><span className={styles.icon}><NavIcon name="document" /></span>
        <DocumentLink className={styles.rowLink} workspaceId={workspaceId} document={row.document}>{row.document.title}</DocumentLink></>;
    }
  };
  const menu = (row: FolderRow) => row.kind === 'folder' && onRename && onDelete
    ? <MoreMenu label={`${row.folder.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[
      { label: '이름·색상 바꾸기', icon: <NavIcon name="edit" />, onClick: () => onRename(row.folder) },
      { label: '지우기', icon: <NavIcon name="delete" />, onClick: () => onDelete(row.folder) },
    ]} /> : null;
  return <>
    <div ref={reorder.list} className={`${moving.list} ${styles.list}`} role="list" aria-label="폴더 내용">
      {shown.map(row => <div key={rowKey(row)} className={`${moving.row} ${styles.row}`} role="listitem" {...reorder.rowProps(rowKey(row))}>
        {onOrder ? <button type="button" className={`${moving.grip} ${styles.grip}`} {...reorder.gripProps({ id: rowKey(row), name: rowName(row) })}><NavIcon name="grip" /></button>
          : <span className={styles.gripSpace} />}
        <span className={`${styles.named} ${row.kind === 'project' ? styles.project : ''}`}
          style={row.kind === 'project' && row.project.color ? { '--project-color': row.project.color } as CSSProperties : undefined}>{name(row)}</span>
        <span className={styles.metadata}>
          {row.kind === 'project' && <><span className={styles.kind}>프로젝트</span>{row.part && <span className={styles.count}>문서 {row.part.documentCount} · 폴더 {row.part.folderCount}</span>}</>}
          {row.kind === 'folder' && <span className={styles.count}>문서 {row.folder.documentCount}</span>}
          {row.kind === 'document' && <>
            {row.document.labelIds.length > 0 && <span className={styles.labels}><LabelTokens labels={labels.filter(label => row.document.labelIds.includes(label.id))} /></span>}
            {row.document.workItems.length > 0 && <span className={styles.linked} title={row.document.workItems.map(item => `${item.reference} ${item.title}`).join('\n')}><NavIcon name="link" />{row.document.workItems[0]!.reference}{row.document.workItems.length > 1 ? ` +${row.document.workItems.length - 1}` : ''}</span>}
          </>}
          <span className={styles.date} title="최근 변경">{dateText(row.kind === 'project' ? row.project.updatedAt : row.kind === 'folder' ? row.folder.updatedAt : row.document.updatedAt)}</span>
        </span>
        <span className={styles.menu}>{menu(row)}</span>
      </div>)}
    </div>
    {foot}
    {onOrder && <span id={reorder.hint} className={styles.spoken}>끌어서 옮기거나 Alt와 위아래 화살표로 옮깁니다. 끄는 동안 Esc는 취소합니다.</span>}
    <span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span>
  </>;
}
