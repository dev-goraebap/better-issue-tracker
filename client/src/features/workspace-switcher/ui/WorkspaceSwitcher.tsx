import { useState } from 'react';
import { Popover } from '@astryxdesign/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { NavIcon } from '@/shared/ui';
import { useAllWorkspaces, WorkspaceMark, type Space } from '@/entities/workspace';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import styles from './workspace-switcher.module.css';

/**
 * The head of the menu, as Kaneo's: the workspace in view as its mark and name. Pressing it opens the member's
 * workspaces, the one in view checked, and under a rule 워크스페이스 추가, which opens the create dialog and then the new
 * workspace's home. Folded, the head is the mark alone and the list opens to its right.
 */
export function WorkspaceSwitcher({ current, isFolded = false }: { current?: Space; isFolded?: boolean }) {
  const workspaces = useAllWorkspaces().items;
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [isCreating, setCreating] = useState(false);
  const shown = current ?? { id: '', name: '워크스페이스 선택' };
  const list = <div className={styles.panel}>
    <span className={styles.panelTitle}>워크스페이스</span>
    <ul className={styles.items} aria-label="워크스페이스">{workspaces.map(workspace => <li key={workspace.id}>
      <Link to="/workspaces/$workspaceId" params={{ workspaceId: workspace.id }} className={styles.item} aria-current={workspace.id === current?.id ? 'page' : undefined} onClick={() => setOpen(false)}>
        <WorkspaceMark workspace={workspace} size="sm" /><span className={styles.itemName}>{workspace.name}</span>
        {workspace.id === current?.id && <span className={styles.check}><NavIcon name="check" /></span>}
      </Link>
    </li>)}</ul>
    <hr className={styles.rule} />
    <button type="button" className={styles.item} onClick={() => { setOpen(false); setCreating(true); }}>
      <span className={styles.addMark}><NavIcon name="plus" /></span><span className={styles.itemName}>워크스페이스 추가</span>
    </button>
  </div>;
  return <>
    <Popover isOpen={isOpen} onOpenChange={setOpen} placement={isFolded ? 'end' : 'below'} alignment="start" width={260} label="워크스페이스 전환" className={styles.popover} content={list}>
      <button type="button" className={styles.trigger} data-folded={isFolded || undefined} aria-label={isFolded ? `${shown.name} · 워크스페이스 전환` : undefined}>
        <WorkspaceMark workspace={shown} />
        {!isFolded && <><span className={styles.triggerName}>{shown.name}</span><span className={styles.chevron}><NavIcon name="chevron-down" /></span></>}
      </button>
    </Popover>
    <CreateWorkspaceDialog isOpen={isCreating} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: id } }); }} />
  </>;
}
