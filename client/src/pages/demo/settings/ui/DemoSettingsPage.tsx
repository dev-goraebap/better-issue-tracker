import { useState } from 'react';
import { Button, Switch, Text, TextInput, VStack } from '@astryxdesign/core';
import { ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, PageFrame, SectionHeader, Select } from '@/shared/ui';
import styles from './settings.module.css';
import { PEOPLE } from '@/entities/demo-sample';

const ROLE_OPTIONS = [{ value: 'owner', label: '소유자' }, { value: 'admin', label: '관리자' }, { value: 'member', label: '멤버' }, { value: 'viewer', label: '보기 전용' }];

/**
 * PATTERN · 설정. Copy this page for a page of settings sections.
 *
 * - PageFrame width="narrow": settings read down one column. No page description under the title; each control says
 *   what it does next to itself.
 * - Each section is SectionHeader over its rows. A form section saves with its own button at its end; a switch applies at
 *   once. A list section (멤버) is ItemList rows with the control at the row's end.
 * - The danger zone is last: what happens, then the action, and a weighty action asks for a typed word (ConfirmDialog word).
 */
export function DemoSettingsPage() {
  const [name, setName] = useState('BIT 개발');
  const [key, setKey] = useState('BIT');
  const [notify, setNotify] = useState({ mention: true, assigned: true, digest: false });
  const [roles, setRoles] = useState<Record<string, string>>({ u1: 'owner', u2: 'admin', u3: 'member', u4: 'viewer' });
  const [isArchiving, setArchiving] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  return <PageFrame title="설정" icon="settings" width="narrow">
    <VStack gap={10}>
      <section aria-labelledby="settings-general">
        <SectionHeader id="settings-general" title="일반" />
        <form className={styles.form} onSubmit={event => event.preventDefault()}>
          <TextInput label="프로젝트 이름" value={name} onChange={setName} isRequired />
          <TextInput label="프로젝트 키" value={key} onChange={value => setKey(value.toUpperCase())} description="작업 번호 앞에 붙습니다. 바꿔도 옛 키로 찾을 수 있습니다." isRequired />
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
      <section aria-labelledby="settings-members" className={styles.members}>
        <SectionHeader id="settings-members" title="멤버 역할" actions={<Button label="멤버 초대" variant="secondary" size="sm" />} />
        <ItemList label="멤버">{PEOPLE.filter(person => person.kind === 'user').map(person => <ItemRow key={person.id}
          lead={<DefaultAvatar seed={person.id} name={person.name} size={24} />} title={person.name}
          meta={<ItemMeta width="9rem"><Select label={`${person.name} 역할`} isLabelHidden size="sm" options={ROLE_OPTIONS} value={roles[person.id]} onChange={value => setRoles({ ...roles, [person.id]: value ?? 'member' })} /></ItemMeta>} />)}
        </ItemList>
      </section>
      <section aria-labelledby="settings-danger">
        <SectionHeader id="settings-danger" title="위험 구역" />
        <div className={styles.danger}>
          <div className={styles.dangerRow}><div><Text weight="semibold">프로젝트 보관</Text><Text type="supporting" color="secondary">작업은 읽을 수만 있게 남고, 언제든 되돌릴 수 있습니다.</Text></div>
            <Button label="보관" variant="secondary" onClick={() => setArchiving(true)} /></div>
          <div className={styles.dangerRow}><div><Text weight="semibold">프로젝트 삭제</Text><Text type="supporting" color="secondary">작업·결정·세션이 목록에서 사라집니다. 기록은 남지만 되돌리려면 관리자가 필요합니다.</Text></div>
            <Button label="삭제" variant="destructive" onClick={() => setDeleting(true)} /></div>
        </div>
      </section>
    </VStack>
    {isArchiving && <ConfirmDialog title="프로젝트를 보관할까요?" description="보관한 프로젝트는 읽을 수만 있습니다. 설정에서 다시 되돌릴 수 있습니다." confirmLabel="보관" onClose={() => setArchiving(false)} onConfirm={() => setArchiving(false)} />}
    {isDeleting && <ConfirmDialog title="프로젝트를 삭제할까요?" description="작업 24개와 결정 5개가 함께 목록에서 사라집니다." confirmLabel="삭제" variant="destructive" word="삭제" onClose={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />}
  </PageFrame>;
}
