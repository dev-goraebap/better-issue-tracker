import type { CSSProperties } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { NavIcon } from '@/shared/ui';
import { ProjectMark, projectsQuery } from '@/entities/project';
import { FolderLink, partsQuery } from '@/entities/document';
import styles from './documents.module.css';

/**
 * 문서함's top (D-093): each project's folder in the projects' order (D-080), drawn apart from ordinary folders as a
 * project's own (its mark on the folder, a link mark at its corner, as a Git submodule), with how much it holds. It
 * opens the project's 문서; it cannot be renamed or deleted. Then 공통, the workspace's own folders and documents.
 */
export function ProjectFolders({ workspaceId }: { workspaceId: string }) {
  const projects = useInfiniteQuery(projectsQuery(workspaceId)).data?.pages.flatMap(page => page.items) ?? [];
  const parts = useQuery(partsQuery(workspaceId, projects.map(project => project.id))).data ?? [];
  if (projects.length === 0) return null;
  return <>
    <section aria-labelledby="documents-projects" className={styles.section}>
      <h2 id="documents-projects" className={styles.sectionHead}>프로젝트</h2>
      <div className={styles.tiles}>{projects.map(project => {
        const part = parts.find(each => each.projectId === project.id);
        return <FolderLink key={project.id} workspaceId={workspaceId} projectId={project.id} className={styles.tile}>
          <span className={styles.folder} style={project.color ? { '--mark': project.color } as CSSProperties : undefined}>
            <svg viewBox="0 0 40 34" aria-hidden="true"><path d="M1 6a4 4 0 0 1 4-4h10l4 4h16a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4z" /></svg>
            <span className={styles.folderMark}><ProjectMark project={project} size="xs" /></span>
          </span>
          <span className={styles.tileText}>
            <span className={styles.tileName}>{project.name}</span>
            <span className={styles.tileMeta}>{project.key}{part ? ` · 문서 ${part.documentCount} · 폴더 ${part.folderCount}` : ''}</span>
          </span>
          <span className={styles.linkMark} title="프로젝트 폴더"><NavIcon name="link" /></span>
        </FolderLink>;
      })}</div>
    </section>
    <h2 className={styles.sectionHead}>공통</h2>
  </>;
}
