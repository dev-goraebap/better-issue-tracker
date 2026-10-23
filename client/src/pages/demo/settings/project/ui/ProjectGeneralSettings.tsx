import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { ConfirmDialog, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { DECISIONS, WORK_ITEMS, type Project } from '@/entities/demo-sample';

/**
 * 일반: the project's name and key (both required, their errors under them; a key changed keeps the old one found, D-011)
 * and description, then 보관 and 삭제 in the danger zone, deleting behind the project's key typed.
 */
export function ProjectGeneralSettings({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState('');
  const [asking, setAsking] = useState<'archive' | 'delete' | null>(null);
  const counts = `작업 ${WORK_ITEMS.filter(item => item.projectId === project.id).length}개와 결정 ${DECISIONS.filter(decision => decision.projectId === project.id).length}개`;
  const keyError = !key.trim() ? '프로젝트 키를 입력해 주세요.' : /^[A-Z][A-Z0-9]{1,9}$/.test(key) ? undefined : '영문 대문자로 시작하는 2~10자의 영문·숫자로 적어 주세요.';
  return <VStack gap={8}>
    <SettingsHead title="일반" description={`${project.name}의 이름과 작업 번호 앞에 붙는 키를 정합니다.`} />
    <SettingsCard title="세부 정보" id="project-details">
      <SettingsRow label="이름">
        <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setName} isRequired
          status={name.trim() ? undefined : { type: 'error', message: '이름을 입력해 주세요. 비어 있으면 저장되지 않습니다.' }} />
      </SettingsRow>
      <SettingsRow label="키" description={`작업 번호가 ${key || project.key}-42처럼 붙습니다. 바꿔도 옛 키로 찾을 수 있습니다.`}>
        <TextInput label="키" isLabelHidden size="sm" value={key} onChange={value => setKey(value.toUpperCase())} isRequired
          status={keyError ? { type: 'error', message: keyError } : undefined} />
      </SettingsRow>
      <SettingsRow label="설명">
        <TextInput label="설명" isLabelHidden size="sm" value={description} onChange={setDescription} placeholder="이 프로젝트가 하는 일을 한 줄로" />
      </SettingsRow>
    </SettingsCard>
    <SettingsCard title="위험 구역" id="project-danger" tone="danger">
      <SettingsRow label="프로젝트 보관" description="읽을 수만 있게 남기고, 언제든 되돌릴 수 있습니다.">
        <Button label="보관" variant="secondary" size="sm" onClick={() => setAsking('archive')} />
      </SettingsRow>
      <SettingsRow label="프로젝트 삭제" description={`${counts}가 함께 사라집니다.`}>
        <Button label="프로젝트 삭제" variant="destructive" size="sm" onClick={() => setAsking('delete')} />
      </SettingsRow>
    </SettingsCard>
    {asking === 'archive' && <ConfirmDialog title="프로젝트를 보관할까요?" description="보관한 프로젝트는 읽을 수만 있습니다. 모든 프로젝트에서 되돌릴 수 있습니다."
      confirmLabel="보관" onClose={() => setAsking(null)} onConfirm={() => setAsking(null)} />}
    {asking === 'delete' && <ConfirmDialog title="프로젝트를 삭제할까요?" description={`되돌릴 수 없습니다. ${counts}가 함께 사라집니다.`}
      confirmLabel="프로젝트 삭제" variant="destructive" word={project.key} onClose={() => setAsking(null)} onConfirm={() => setAsking(null)} />}
  </VStack>;
}
