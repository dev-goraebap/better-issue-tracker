import { Button, VStack } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { NavIcon, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { PEOPLE, ROLE_LABELS, workspacePath, type Role, type Workspace } from '@/entities/demo-sample';
import styles from './workspace-settings.module.css';

const ROLES: readonly Role[] = ['viewer', 'member', 'admin', 'owner'];
/** What each role may do, the least first; a role may do all that the roles before it may. */
const ABILITIES: readonly { label: string; from: Role }[] = [
  { label: '작업·결정·문서 보기', from: 'viewer' },
  { label: '작업과 결정을 만들고 고치기, 댓글', from: 'member' },
  { label: '프로젝트 만들기와 프로젝트 설정', from: 'admin' },
  { label: '구성원 초대와 역할 변경', from: 'admin' },
  { label: '워크스페이스 설정과 연동', from: 'admin' },
  { label: '워크스페이스 삭제와 소유권 이전', from: 'owner' },
];

/**
 * 역할: the four roles (D-040, D-048, D-049) and what each may do, read as a table of marks; how many members hold each, and the way
 * to 구성원, where roles are given.
 */
export function RolesSettings({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const holders = (role: Role) => PEOPLE.filter(person => person.role === role).length;
  return <VStack gap={8}>
    <SettingsHead title="역할" description="역할은 네 가지이고, 오른쪽 역할은 왼쪽 역할이 하는 일을 모두 합니다." />
    <SettingsCard title="할 수 있는 일" id="roles-abilities">
      <div className={styles.tableWrap}>
        <table className={styles.matrix}>
          <thead><tr><th scope="col"><span className={styles.quiet}>할 일</span></th>
            {ROLES.map(role => <th key={role} scope="col">{ROLE_LABELS[role]}<span className={styles.holders}>{holders(role)}명</span></th>)}</tr></thead>
          <tbody>{ABILITIES.map(ability => <tr key={ability.label}>
            <th scope="row">{ability.label}</th>
            {ROLES.map(role => {
              const can = ROLES.indexOf(role) >= ROLES.indexOf(ability.from);
              return <td key={role} aria-label={can ? '할 수 있음' : '할 수 없음'}>{can ? <NavIcon name="check" /> : <span className={styles.no}>—</span>}</td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </SettingsCard>
    <SettingsCard title="역할 주기" id="roles-members">
      <SettingsRow label="구성원" description={`${workspace.members}명`}>
        <Button label="구성원으로" variant="secondary" size="sm" onClick={() => void navigate({ href: workspacePath(workspace.id, '/members') })} />
      </SettingsRow>
    </SettingsCard>
  </VStack>;
}
