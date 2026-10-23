import { VStack } from '@astryxdesign/core';
import { SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { PEOPLE, useWorkspaces, WorkspaceMark } from '@/entities/demo-sample';

/** 워크스페이스: every workspace on the instance, its owner and how big it is, read only. */
export function AdminWorkspaces() {
  const workspaces = useWorkspaces();
  const owner = PEOPLE.find(person => person.role === 'owner');
  return <VStack gap={8}>
    <SettingsHead title="워크스페이스" description="이 서버의 모든 워크스페이스입니다. 안의 내용은 각 워크스페이스의 구성원만 봅니다." />
    <SettingsCard title={`워크스페이스 ${workspaces.length}개`} id="admin-workspaces">
      {workspaces.map(workspace => <SettingsRow key={workspace.id} lead={<WorkspaceMark workspace={workspace} />} label={workspace.name}
        description={`소유자 ${owner?.name ?? '—'} · 프로젝트 ${workspace.projects}개 · 구성원 ${workspace.members}명`} />)}
    </SettingsCard>
  </VStack>;
}
