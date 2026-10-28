import { Fragment } from 'react';
import { FolderLink, type Folder } from '@/entities/document';
import styles from './folder.module.css';

/** Where a folder is (BIT-41), in the row under a phone's header: its part, then each folder down to it (BIT-115). */
export function FolderTrail({ workspaceId, projectId, rootLabel, path }: {
  workspaceId: string; projectId: string | null; rootLabel: string; path: readonly Folder[];
}) {
  return <nav className={styles.trail} aria-label="폴더 위치">
    <FolderLink workspaceId={workspaceId} projectId={projectId}>{rootLabel}</FolderLink>
    {path.map((folder, at) => <Fragment key={folder.id}><span className={styles.step} aria-hidden="true">›</span>
      {at === path.length - 1 ? <span aria-current="page">{folder.name}</span>
        : <FolderLink workspaceId={workspaceId} projectId={projectId} folderId={folder.id}>{folder.name}</FolderLink>}
    </Fragment>)}
  </nav>;
}
