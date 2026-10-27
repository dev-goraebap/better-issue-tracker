import type { ReactNode } from 'react';
import { MoreMenu } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { dateText } from '@/shared/lib/date-text';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon, SHEET_ROW_LINK, SheetTable, type SheetColumn } from '@/shared/ui';
import { DocumentLink, FolderLink, type Folder } from '@/entities/document';
import { ProjectMark } from '@/entities/project';
import { LabelTokens } from '@/entities/work-item';
import type { Label } from '@/entities/label';
import type { FolderRow } from '../model/rows';
import styles from './folder.module.css';

/**
 * A folder's contents drawn as the other lists (BIT-41): a table on a desktop (이름, 라벨, 연결된 업무, 최근 변경), rows
 * on a phone. At 문서함's top each project's folder leads with the project's mark and a link mark, a part of its own
 * (D-093); a folder says how many documents it holds; a document its labels and the work items it is linked to. Someone
 * who may write renames or deletes a folder from its row's menu.
 */
export function FolderTable({ workspaceId, projectId, rows, labels, foot, onRename, onDelete }: {
  workspaceId: string; projectId: string | null; rows: FolderRow[]; labels: Label[]; foot?: ReactNode;
  onRename?: (folder: Folder) => void; onDelete?: (folder: Folder) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const labelsOf = (ids: readonly string[]) => labels.filter(label => ids.includes(label.id));
  const name = (row: FolderRow, link: string) => {
    switch (row.kind) {
      case 'project': return <span className={styles.named}><ProjectMark project={row.project} />
        <FolderLink className={link} workspaceId={workspaceId} projectId={row.project.id}>{row.project.name}</FolderLink>
        <span className={styles.partMark} title="프로젝트 폴더"><NavIcon name="link" /></span></span>;
      case 'folder': return <span className={styles.named}><span className={styles.icon}><NavIcon name="documents" /></span>
        <FolderLink className={link} workspaceId={workspaceId} projectId={projectId} folderId={row.folder.id}>{row.folder.name}</FolderLink></span>;
      case 'document': return <span className={styles.named}><span className={styles.icon}><NavIcon name="document" /></span>
        <DocumentLink className={link} workspaceId={workspaceId} document={row.document}>{row.document.title}</DocumentLink></span>;
    }
  };
  const holds = (row: FolderRow) => row.kind === 'project'
    ? (row.part ? `문서 ${row.part.documentCount} · 폴더 ${row.part.folderCount}` : '')
    : row.kind === 'folder' ? `문서 ${row.folder.documentCount}` : '';
  const linked = (row: FolderRow) => {
    if (row.kind !== 'document' || row.document.workItems.length === 0) return '';
    const [first, ...rest] = row.document.workItems;
    return `${first!.reference}${rest.length > 0 ? ` 외 ${rest.length}` : ''}`;
  };
  const changed = (row: FolderRow) => row.kind === 'folder' ? dateText(row.folder.updatedAt) : row.kind === 'document' ? dateText(row.document.updatedAt) : '';
  const menu = (row: FolderRow) => (row.kind === 'folder' && onRename && onDelete
    ? <MoreMenu label={`${row.folder.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[
      { label: '이름 바꾸기', icon: <NavIcon name="edit" />, onClick: () => onRename(row.folder) },
      { label: '지우기', icon: <NavIcon name="delete" />, onClick: () => onDelete(row.folder) },
    ]} /> : undefined);
  if (isMobile) return <ItemList label="폴더 내용">{rows.map(row => <ItemRow key={`${row.kind}-${row.id}`} title={name(row, ITEM_ROW_LINK)}
    meta={<><ItemMeta>{row.kind === 'document' ? linked(row) : holds(row)}</ItemMeta><ItemMeta>{changed(row)}</ItemMeta></>} end={menu(row)} />)}</ItemList>;
  const columns: SheetColumn<FolderRow>[] = [
    { key: 'name', header: '이름', render: row => <span className={styles.nameCell}>{name(row, SHEET_ROW_LINK)}<span className={styles.holds}>{holds(row)}</span></span> },
    { key: 'labels', header: '라벨', width: '12rem', render: row => (row.kind === 'document' ? <LabelTokens labels={labelsOf(row.document.labelIds)} /> : null) },
    { key: 'work', header: '연결된 업무', width: '9rem', render: row => <span className={styles.key}>{linked(row)}</span> },
    { key: 'changed', header: '최근 변경', width: '8rem', render: changed },
    ...(onRename ? [{ key: 'menu', header: '', width: '3rem', align: 'end' as const, render: (row: FolderRow) => menu(row) ?? null }] : []),
  ];
  return <SheetTable label="폴더 내용" columns={columns} rows={rows} rowKey={row => `${row.kind}-${row.id}`} minWidth="44rem" foot={foot} />;
}
