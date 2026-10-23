import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { CompactDialog, ConfirmDialog, NavIcon, SettingsCard, SettingsHead, SettingsRow, Select } from '@/shared/ui';
import { PEOPLE, personOf, ROLE_LABELS, WorkspaceMark, type Workspace } from '@/entities/demo-sample';

/**
 * 일반: the workspace's logo, name (required, its error under it) and description; who owns it, handed to another
 * administrator in a short dialog; then the danger zone, deleting it behind a typed word.
 */
export function GeneralSettings({ workspace }: { workspace: Workspace }) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [ownerId, setOwnerId] = useState(PEOPLE.find(person => person.role === 'owner')?.id);
  const [isHanding, setHanding] = useState(false);
  const [nextOwner, setNextOwner] = useState<string | undefined>();
  const [isDeleting, setDeleting] = useState(false);
  const admins = PEOPLE.filter(person => person.kind === 'user' && person.id !== ownerId && person.role === 'admin');
  const owner = personOf(ownerId);
  const hand = () => { if (nextOwner) setOwnerId(nextOwner); setHanding(false); setNextOwner(undefined); };
  return <VStack gap={8}>
    <SettingsHead title="일반" description="워크스페이스의 이름과 얼굴, 소유자를 정합니다." />
    <SettingsCard title="세부 정보" id="workspace-details">
      <SettingsRow lead={<WorkspaceMark workspace={{ ...workspace, name: name || workspace.name }} size="lg" />} label="로고" description="정사각형 PNG·JPG·WebP·SVG, 1MB 이하">
        <Button label="업로드" variant="secondary" size="sm" icon={<NavIcon name="attach" />} />
      </SettingsRow>
      <SettingsRow label="이름">
        <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setName} isRequired
          status={name.trim() ? undefined : { type: 'error', message: '이름을 입력해 주세요. 비어 있으면 저장되지 않습니다.' }} />
      </SettingsRow>
      <SettingsRow label="설명">
        <TextInput label="설명" isLabelHidden size="sm" value={description} onChange={setDescription} placeholder="무엇을 하는 공간인지 한 줄로" />
      </SettingsRow>
    </SettingsCard>
    <SettingsCard title="소유권" id="workspace-owner">
      <SettingsRow label={`소유자 · ${owner?.name ?? '없음'}`} description="소유자만 워크스페이스를 지우거나 소유권을 넘길 수 있습니다.">
        <Button label="소유권 이전" variant="secondary" size="sm" onClick={() => setHanding(true)} />
      </SettingsRow>
    </SettingsCard>
    <SettingsCard title="위험 구역" id="workspace-danger" tone="danger">
      <SettingsRow label="워크스페이스 삭제" description={`프로젝트 ${workspace.projects}개와 그 안의 작업·결정·문서가 함께 사라집니다.`}>
        <Button label="워크스페이스 삭제" variant="destructive" size="sm" onClick={() => setDeleting(true)} />
      </SettingsRow>
    </SettingsCard>
    <CompactDialog isOpen={isHanding} title="소유권 이전" onClose={() => setHanding(false)} onSubmit={hand}
      footer={<><Button label="취소" variant="ghost" onClick={() => setHanding(false)} /><Button type="submit" label="이전" variant="primary" /></>}>
      <Select label={`새 소유자 (${ROLE_LABELS.admin})`} options={admins.map(person => ({ value: person.id, label: person.name }))} value={nextOwner}
        onChange={value => setNextOwner(value ?? undefined)} isRequired />
    </CompactDialog>
    {isDeleting && <ConfirmDialog title="워크스페이스를 삭제할까요?" description="되돌릴 수 없습니다. 구성원 모두가 이 워크스페이스에 들어올 수 없게 됩니다."
      confirmLabel="워크스페이스 삭제" variant="destructive" word={workspace.name} onClose={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />}
  </VStack>;
}
