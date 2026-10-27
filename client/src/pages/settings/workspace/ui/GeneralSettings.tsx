import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, capabilitiesQueryOptions, sessionQueryOptions } from '@/shared/api';
import { CompactDialog, ConfirmDialog, FormMessage, Select, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import {
  canManage, changeLogo, deleteWorkspace, forgetWorkspace, leaveWorkspace, refreshWorkspace, removeLogo, renameWorkspace, transferOwner, useMembers, WorkspaceMark, type Space,
} from '@/entities/workspace';
import { PictureButton, PictureDialog } from '@/features/picture-change';
import styles from './workspace-settings.module.css';

/**
 * 일반: the workspace's name (required, saved on its own), its logo (BIT-30, in a short dialog that crops it, while the
 * server keeps files), its fixed address, who owns it, handed to another member in a
 * short dialog that asks the owner's password again; then the danger zone: the owner deletes it behind its typed name,
 * anyone else leaves it. A viewer or member reads the name without changing it.
 */
export function GeneralSettings({ workspace }: { workspace: Space }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery(sessionQueryOptions).data?.user.id;
  const members = useMembers(workspace.id).items;
  const isOwner = workspace.myRole === 'owner';
  const canEdit = canManage(workspace);
  const [name, setName] = useState(workspace.name);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isHanding, setHanding] = useState(false);
  const [nextOwner, setNextOwner] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [handError, setHandError] = useState('');
  const [leaving, setLeaving] = useState<'delete' | 'leave' | null>(null);
  const [leaveError, setLeaveError] = useState<Error | null>(null);
  const [isPicturing, setPicturing] = useState(false);
  const canPicture = canEdit && !!useQuery(capabilitiesQueryOptions).data?.objectStorage;
  const pictured = async (change: Promise<unknown>, done: string) => {
    await change;
    await refreshWorkspace(client, workspace.id);
    setError(''); setNotice(done);
  };
  const rename = async () => {
    if (!name.trim() || name.trim() === workspace.name || isBusy) return;
    setBusy(true); setError(''); setNotice('');
    try { await renameWorkspace(workspace.id, name.trim()); setNotice('이름을 바꿨습니다.'); await refreshWorkspace(client, workspace.id); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  const hand = async () => {
    if (!nextOwner || !password || isBusy) return;
    setBusy(true); setHandError('');
    try {
      await transferOwner(workspace.id, nextOwner, password);
      setHanding(false); setPassword(''); setNextOwner(undefined); setNotice('소유권을 넘겼습니다. 내 역할은 관리자입니다.');
      await refreshWorkspace(client, workspace.id);
    } catch (failure) { setHandError(authError(failure)); setPassword(''); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    if (!leaving || isBusy) return;
    setBusy(true); setLeaveError(null);
    try {
      await (leaving === 'leave' ? leaveWorkspace(workspace.id) : deleteWorkspace(workspace.id));
      await forgetWorkspace(client, workspace.id);
      await navigate({ to: '/workspaces' });
    } catch (failure) { setLeaveError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  const owner = members.find(member => member.role === 'owner');
  return <VStack gap={8}>
    <SettingsHead title="일반" description="워크스페이스의 이름과 소유자를 정합니다." />
    <SettingsCard title="세부 정보" id="workspace-details">
      <SettingsRow lead={<PictureButton label="워크스페이스 이미지 바꾸기" isDisabled={!canPicture} onClick={() => setPicturing(true)}><WorkspaceMark workspace={{ id: workspace.id, name: name || workspace.name, logo: workspace.logo }} size="lg" /></PictureButton>} label="이름"
        description={canEdit ? '바꾸면 구성원 모두에게 바로 보입니다.' : undefined}>
        {canEdit ? <form onSubmit={event => { event.preventDefault(); void rename(); }} className={styles.nameForm}>
          <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setName} isRequired isDisabled={isBusy}
            status={name.trim() ? undefined : { type: 'error', message: '이름을 입력해 주세요.' }} />
          <Button type="submit" label="저장" variant="secondary" size="sm" isDisabled={!name.trim() || name.trim() === workspace.name} isLoading={isBusy} />
        </form> : workspace.name}
      </SettingsRow>
      <SettingsRow label="고정 주소" description="워크스페이스를 만들 때 정해지고 바뀌지 않습니다.">{workspace.slug}</SettingsRow>
    </SettingsCard>
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    <SettingsCard title="소유권" id="workspace-owner">
      <SettingsRow label={`소유자 · ${owner?.name ?? '-'}`} description="소유자만 워크스페이스를 지우거나 소유권을 넘길 수 있습니다.">
        {isOwner && <Button label="소유권 이전" variant="secondary" size="sm" onClick={() => setHanding(true)} />}
      </SettingsRow>
    </SettingsCard>
    <SettingsCard title="위험 구역" id="workspace-danger" tone="danger">
      {isOwner
        ? <SettingsRow label="워크스페이스 삭제" description="구성원 모두가 이 워크스페이스에 들어올 수 없게 되고 대기 중인 초대가 폐기됩니다.">
          <Button label="워크스페이스 삭제" variant="destructive" size="sm" onClick={() => setLeaving('delete')} />
        </SettingsRow>
        : <SettingsRow label="워크스페이스 나가기" description="이 워크스페이스에 들어올 수 없게 됩니다. 다시 참여하려면 새 초대가 필요합니다.">
          <Button label="나가기" variant="destructive" size="sm" onClick={() => setLeaving('leave')} />
        </SettingsRow>}
    </SettingsCard>
    <CompactDialog isOpen={isHanding} title="소유권 이전" isBusy={isBusy} onClose={() => { if (!isBusy) { setHanding(false); setPassword(''); setHandError(''); } }} onSubmit={() => { void hand(); }}
      footer={<><Button label="취소" variant="ghost" onClick={() => { setHanding(false); setPassword(''); }} isDisabled={isBusy} /><Button type="submit" label="이전" variant="primary" isLoading={isBusy} isDisabled={!nextOwner || !password} /></>}>
      <Select label="새 소유자" options={members.filter(member => member.userId !== me).map(member => ({ value: member.userId, label: `${member.name} · ${member.email}` }))}
        value={nextOwner} onChange={value => setNextOwner(value ?? undefined)} isRequired />
      <TextInput label="내 비밀번호" type="password" value={password} onChange={setPassword} isRequired isDisabled={isBusy} description="소유권을 넘기기 전에 한 번 더 확인합니다." />
      <FormMessage message={handError} />
    </CompactDialog>
    {leaving && <ConfirmDialog title={leaving === 'delete' ? '워크스페이스를 삭제할까요?' : '워크스페이스에서 나갈까요?'}
      description={leaving === 'delete' ? '구성원 모두가 이 워크스페이스에 들어올 수 없게 됩니다.' : '다시 참여하려면 새 초대가 필요합니다.'}
      confirmLabel={leaving === 'delete' ? '워크스페이스 삭제' : '나가기'} variant="destructive" word={leaving === 'delete' ? workspace.name : undefined}
      isPending={isBusy} error={leaveError} onClose={() => { setLeaving(null); setLeaveError(null); }} onConfirm={() => { void leave(); }} />}
    {isPicturing && <PictureDialog title="워크스페이스 로고" shape="rect" filename="logo.jpg" hasPicture={!!workspace.logo}
      preview={<WorkspaceMark workspace={workspace} size="lg" />} onClose={() => setPicturing(false)}
      onSave={uploadId => pictured(changeLogo(workspace.id, uploadId), '로고를 바꿨습니다.')}
      onRemove={() => pictured(removeLogo(workspace.id), '로고를 뺐습니다.')} />}
  </VStack>;
}
