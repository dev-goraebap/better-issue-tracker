import { useState } from 'react';
import { Button, Switch } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { addProjectMember, ProjectMark, removeProjectMember, type Project } from '@/entities/project';
import type { Member } from '@/entities/workspace';
import styles from './members.module.css';

/**
 * A member's projects (D-075, 짧은 창): every live project with its mark, name and key, and for those who manage
 * members a switch on each that adds the member to it or takes them off at once; the others read where the member
 * works. Belonging grants nothing: the member reads every project either way, as the foot says.
 */
export function MemberProjectsDialog({ workspaceId, member, projects, joined, canEdit, onClose }: {
  workspaceId: string; member: Member; projects: readonly Project[]; joined: ReadonlySet<string>; canEdit: boolean; onClose: () => void;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const shown = canEdit ? projects : projects.filter(project => joined.has(project.id));
  const toggle = async (project: Project, isOn: boolean) => {
    setBusy(project.id); setError('');
    try {
      if (isOn) await addProjectMember(workspaceId, project.id, member.userId);
      else await removeProjectMember(workspaceId, project.id, member.userId);
      await client.invalidateQueries({ queryKey: ['workspace', workspaceId, 'project-members'] });
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(''); }
  };
  return <CompactDialog title={`${member.name}의 참여 프로젝트`} subtitle={canEdit ? '스위치로 프로젝트에 넣거나 뺍니다. 바로 저장됩니다.' : undefined}
    width={560} onClose={onClose} footer={<Button label="닫기" variant="secondary" onClick={onClose} />}
    footerStart={<span className={styles.note}>참여하지 않아도 워크스페이스의 모든 프로젝트를 볼 수 있습니다.</span>}>
    {shown.length === 0
      ? <p className={styles.note}>{canEdit ? '아직 프로젝트가 없습니다.' : '참여한 프로젝트가 없습니다.'}</p>
      : <ul className={styles.projectList} aria-label="프로젝트">{shown.map(project => <li key={project.id} className={styles.projectRow}>
        <ProjectMark project={project} size="md" />
        <span className={styles.projectText}><span className={styles.personName}>{project.name}</span><span className={styles.personEmail}>{project.key}</span></span>
        {canEdit && <Switch label={`${project.name}에 참여`} isLabelHidden size="sm" value={joined.has(project.id)} isDisabled={busy === project.id}
          onChange={isOn => { void toggle(project, isOn); }} />}
      </li>)}</ul>}
    <FormMessage message={error} />
  </CompactDialog>;
}
