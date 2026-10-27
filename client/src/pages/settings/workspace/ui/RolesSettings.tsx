import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, VStack } from '@astryxdesign/core';
import { NavIcon, SettingsAction, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { ROLE_LABELS, ROLES, useMembers, customRolesQuery, workspaceQuery, canManage, type CustomRole, type Role } from '@/entities/workspace';
import { CustomRoleDialog } from './CustomRoleDialog';
import styles from './workspace-settings.module.css';

/** What each role may do, the least first; a role may do all that the roles before it may (D-040, D-048, D-049). */
const ABILITIES: readonly { label: string; from: Role }[] = [
  { label: '업무·결정·문서 보기', from: 'viewer' },
  { label: '업무·일정 만들고 고치기', from: 'member' },
  { label: '문서·폴더 만들고 고치기', from: 'member' },
  { label: '라벨 만들고 고치기·순서 변경', from: 'member' },
  { label: '프로젝트 설정과 워크플로', from: 'admin' },
  { label: '구성원 초대와 역할 변경', from: 'admin' },
  { label: '워크스페이스 이름 바꾸기', from: 'admin' },
  { label: '워크스페이스 삭제와 소유권 이전', from: 'owner' },
];

/** A role in a line: what it adds to the role before it. */
const SUMMARIES: Record<Role, string> = {
  viewer: '업무·결정·문서를 볼 수만 있습니다.',
  member: '업무·일정·문서·폴더·라벨을 만들고 고칩니다.',
  admin: '멤버가 하는 일에 더해 프로젝트 설정과 워크플로, 구성원 초대와 역할, 워크스페이스 이름을 맡습니다.',
  owner: '관리자가 하는 일에 더해 워크스페이스를 지우고 소유권을 넘깁니다. 한 명뿐입니다.',
};

/**
 * 역할: the four built-in roles as plain lines, as Kaneo shows its own: each one's name, what it adds in a line and how
 * many members hold it. The ability-by-ability table is there to open (권한 자세히 비교) for whoever needs it, then the way
 * to 구성원, where roles are given.
 */
export function RolesSettings({ workspaceId }: { workspaceId: string }) {
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const customRoles = useQuery(customRolesQuery(workspaceId)).data ?? [];
  const [editing, setEditing] = useState<CustomRole | 'new' | null>(null);
  const canEdit = canManage(workspace, 'MANAGE_MEMBERS') && canManage(workspace);
  const members = useMembers(workspaceId).items;
  const holders = (role: Role) => members.filter(member => !member.customRoleId && member.role === role).length;
  return <VStack gap={8}>
    <SettingsHead title="역할" description="기본 역할은 네 가지이고, 아래 역할은 위 역할이 하는 일을 모두 합니다." />
    <SettingsCard title="기본 역할" id="roles-built-in" actions={canEdit ? <Button label="역할 추가" icon={<NavIcon name="plus" />} variant="secondary" size="sm" onClick={() => setEditing('new')} /> : undefined}>
      {ROLES.map(role => <SettingsRow key={role} label={<>{ROLE_LABELS[role]}<span className={styles.holderCount}>{holders(role)}명</span></>} description={SUMMARIES[role]} />)}
    </SettingsCard>
    <details className={styles.compare}>
      <summary className={styles.compareToggle}><span className={styles.compareChevron}><NavIcon name="chevron-down" /></span>권한 자세히 비교</summary>
      <div className={styles.compareCard}>
        <table className={styles.matrix}>
          <thead><tr><th scope="col"><span className={styles.quiet}>할 일</span></th>
            {ROLES.map(role => <th key={role} scope="col">{ROLE_LABELS[role]}</th>)}</tr></thead>
          <tbody>{ABILITIES.map(ability => <tr key={ability.label}>
            <th scope="row">{ability.label}</th>
            {ROLES.map(role => {
              const can = ROLES.indexOf(role) >= ROLES.indexOf(ability.from);
              return <td key={role} aria-label={can ? '할 수 있음' : '할 수 없음'}>
                <span className={styles.mark} data-can={can || undefined}>{can ? <NavIcon name="check" /> : <span className={styles.no} />}</span>
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </details>
    <SettingsCard title="사용자 정의 역할" id="roles-custom">
      {customRoles.length ? customRoles.map(role => <SettingsRow key={role.id} label={<>{role.name}<span className={styles.holderCount}>{role.memberCount}명</span></>}
        description={role.permissions.filter(permission => permission !== 'READ').map(permission => ({ WRITE_WORK: '업무·일정', WRITE_DOCUMENTS: '문서·폴더', MANAGE_LABELS: '라벨', EDIT_SETTINGS: '설정', MANAGE_MEMBERS: '구성원' })[permission as 'WRITE_WORK']).join(' · ') || '보기 전용'}>
        {canEdit && <SettingsAction icon="edit" label={`${role.name} 고치기`} tooltip="고치기" onClick={() => setEditing(role)} />}
      </SettingsRow>) : <SettingsRow label="아직 추가한 역할이 없습니다" description="역할을 만들면 구성원 페이지에서 부여할 수 있습니다." />}
    </SettingsCard>
    {editing && <CustomRoleDialog workspaceId={workspaceId} role={editing === 'new' ? undefined : editing} allowed={workspace?.permissions ?? []} onClose={() => setEditing(null)} />}
  </VStack>;
}
