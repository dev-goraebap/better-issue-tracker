import { useState } from 'react';
import { Button, Switch, Text, TextInput, VStack } from '@astryxdesign/core';
import { useParams } from '@tanstack/react-router';
import { ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, PageFrame, SectionHeader, Select } from '@/shared/ui';
import { DECISIONS, PEOPLE, projectOf, ROLE_LABELS, WORK_ITEMS, workspaceOf, type Role } from '@/entities/demo-sample';
import styles from './settings.module.css';

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map(role => ({ value: role, label: ROLE_LABELS[role] }));

/**
 * PATTERN · 설정, /demo/w/$workspaceId/settings and /demo/w/$workspaceId/p/$projectId/settings. Copy this page for a page of
 * settings sections.
 *
 * - PageFrame width="narrow": settings read down one column. No page description under the title; each control says
 *   what it does next to itself.
 * - Each section is SectionHeader over its rows. A form section saves with its own button at its end; a switch applies at
 *   once. A list section (멤버 역할, the workspace's) is ItemList rows with the control at the row's end.
 * - The danger zone is last: what happens, then the action, and a weighty action asks for a typed word (ConfirmDialog word).
 */
export function DemoSettingsPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const project = projectOf(projectId);
  const workspace = workspaceOf(workspaceId);
  const [name, setName] = useState(project?.name ?? workspace?.name ?? '');
  const [key, setKey] = useState(project?.key ?? '');
  const [notify, setNotify] = useState({ mention: true, assigned: true, digest: false });
  const [roles, setRoles] = useState<Record<string, string>>(() => Object.fromEntries(PEOPLE.filter(person => person.role).map(person => [person.id, person.role as string])));
  const [isArchiving, setArchiving] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const what = project ? '프로젝트' : '워크스페이스';
  const counts = project
    ? `작업 ${WORK_ITEMS.filter(item => item.projectId === project.id).length}개와 결정 ${DECISIONS.filter(decision => decision.projectId === project.id).length}개`
    : `프로젝트 ${workspace?.projects ?? 0}개와 그 안의 작업`;
  return <PageFrame title={`${what} 설정`} icon="settings" width="narrow">
    <VStack gap={10}>
      <section aria-labelledby="settings-general">
        <SectionHeader id="settings-general" title="일반" />
        <form className={styles.form} onSubmit={event => event.preventDefault()}>
          <TextInput label={`${what} 이름`} value={name} onChange={setName} isRequired />
          {project && <TextInput label="프로젝트 키" value={key} onChange={value => setKey(value.toUpperCase())} description="작업 번호 앞에 붙습니다. 바꿔도 옛 키로 찾을 수 있습니다." isRequired />}
          <span className={styles.save}><Button type="submit" label="저장" variant="primary" /></span>
        </form>
      </section>
      <section aria-labelledby="settings-notify">
        <SectionHeader id="settings-notify" title="알림" />
        <div className={styles.rows}>
          <Switch label="나를 언급하면 알림" value={notify.mention} onChange={value => setNotify({ ...notify, mention: value })} />
          <Switch label="작업이 배정되면 알림" value={notify.assigned} onChange={value => setNotify({ ...notify, assigned: value })} />
          <Switch label="매일 아침 요약 메일" value={notify.digest} onChange={value => setNotify({ ...notify, digest: value })} description="메일 기능이 켜진 서버에서만 보냅니다." />
        </div>
      </section>
      {!project && <section aria-labelledby="settings-members" className={styles.members}>
        <SectionHeader id="settings-members" title="멤버 역할" actions={<Button label="멤버 초대" variant="secondary" size="sm" />} />
        <ItemList label="멤버">{PEOPLE.filter(person => person.kind === 'user').map(person => <ItemRow key={person.id}
          lead={<DefaultAvatar seed={person.id} name={person.name} size={24} />} title={person.name}
          meta={<ItemMeta width="9rem"><Select label={`${person.name} 역할`} isLabelHidden size="sm" options={ROLE_OPTIONS} value={roles[person.id]} onChange={value => setRoles({ ...roles, [person.id]: value ?? 'member' })} /></ItemMeta>} />)}
        </ItemList>
      </section>}
      <section aria-labelledby="settings-danger">
        <SectionHeader id="settings-danger" title="위험 구역" />
        <div className={styles.danger}>
          {project && <div className={styles.dangerRow}><div><Text weight="semibold">프로젝트 보관</Text><Text type="supporting" color="secondary">작업은 읽을 수만 있게 남고, 언제든 되돌릴 수 있습니다.</Text></div>
            <Button label="보관" variant="secondary" onClick={() => setArchiving(true)} /></div>}
          <div className={styles.dangerRow}><div><Text weight="semibold">{what} 삭제</Text><Text type="supporting" color="secondary">{counts}이 목록에서 사라집니다. 기록은 남지만 되돌리려면 관리자가 필요합니다.</Text></div>
            <Button label="삭제" variant="destructive" onClick={() => setDeleting(true)} /></div>
        </div>
      </section>
    </VStack>
    {isArchiving && <ConfirmDialog title="프로젝트를 보관할까요?" description="보관한 프로젝트는 읽을 수만 있습니다. 설정에서 다시 되돌릴 수 있습니다." confirmLabel="보관" onClose={() => setArchiving(false)} onConfirm={() => setArchiving(false)} />}
    {isDeleting && <ConfirmDialog title={`${what}를 삭제할까요?`} description={`${counts}이 함께 목록에서 사라집니다.`} confirmLabel="삭제" variant="destructive" word="삭제" onClose={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />}
  </PageFrame>;
}
