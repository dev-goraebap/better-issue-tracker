import { useState, type MouseEvent } from 'react';
import { Popover, TextInput } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { workspacePath } from '@/shared/config';
import { isPlainClick } from '@/shared/lib/history-trail';
import { NavIcon } from '@/shared/ui';
import { ProjectMark, type Project } from '@/entities/project';
import styles from './project-switcher.module.css';

/** Project focus uses the existing workspace switcher's chrome, with the workspace kept as quiet context. */
export function ProjectSwitcher({ workspaceId, workspaceName, currentId, current, projects, isFolded = false, hrefFor, onSelect }: {
  workspaceId: string; workspaceName?: string; currentId: string; current?: Project; projects: readonly Project[];
  isFolded?: boolean; hrefFor: (id: string) => string; onSelect?: (href: string) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const shown = current ?? { key: '', name: '프로젝트' };
  const choices = current && !projects.some(project => project.id === current.id) ? [current, ...projects] : projects;
  const matches = choices.filter(project => `${project.name} ${project.key}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const select = (event: MouseEvent, href: string) => {
    if (!isPlainClick(event)) return;
    event.preventDefault(); setOpen(false);
    if (onSelect) onSelect(href); else void navigate({ href });
  };
  return <Popover isOpen={isOpen} onOpenChange={open => { setOpen(open); if (!open) setQuery(''); }} placement={isFolded ? 'end' : 'below'} alignment="start" width={280} label="프로젝트 전환" className={styles.popover}
    content={<div className={styles.panel}>
      <a href={workspacePath(workspaceId, '/issues')} className={styles.workspaceLink} aria-label={`${workspaceName ?? '워크스페이스'} 전체 보기`} onClick={event => select(event, workspacePath(workspaceId, '/issues'))}><NavIcon name="previous" /><span>{workspaceName ?? '워크스페이스'}</span></a>
      {choices.length > 8 && <div className={styles.search}><TextInput label="프로젝트 찾기" isLabelHidden placeholder="이름이나 키로 찾기" value={query} onChange={setQuery} size="sm" /></div>}
      <ul className={styles.items} aria-label="프로젝트 전환 목록">{matches.map(project => <li key={project.id}>
        <a href={hrefFor(project.id)} className={styles.item} aria-current={project.id === currentId ? 'page' : undefined} onClick={event => select(event, hrefFor(project.id))}>
          <ProjectMark project={project} /><span className={styles.itemName}>{project.name}</span><span className={styles.key}>{project.key}</span>
          {project.id === currentId && <span className={styles.check}><NavIcon name="check" /></span>}
        </a>
      </li>)}</ul>
      {matches.length === 0 && <p className={styles.empty}>일치하는 프로젝트가 없습니다.</p>}
      <hr className={styles.rule} />
      <a href={workspacePath(workspaceId, '/projects')} className={styles.item} onClick={event => select(event, workspacePath(workspaceId, '/projects'))}><NavIcon name="projects" /><span className={styles.itemName}>프로젝트 목록</span></a>
    </div>}>
    <button type="button" className={styles.trigger} data-folded={isFolded || undefined} aria-label={`${shown.name} · 프로젝트 전환`}>
      {current ? <ProjectMark project={current} /> : <NavIcon name="projects" />}
      {!isFolded && <><span className={styles.triggerName}>{shown.name}</span><span className={styles.chevron}><NavIcon name="chevron-down" /></span></>}
    </button>
  </Popover>;
}
