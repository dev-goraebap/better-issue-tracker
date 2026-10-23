import { useState } from 'react';
import { Button, IconButton, VStack } from '@astryxdesign/core';
import { NavIcon, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';

type Repository = { path: string; branch: string; lastHook: string; isHealthy: boolean };

/**
 * 저장소: the Git repositories (on the workspace's Git server, 연동) whose commits and merge requests are read for this
 * project's keys; several may be linked, unlike Kaneo's one (02-domain-model CodeRef). Each says when its webhook last
 * arrived, a silent one marked.
 */
export function RepositorySettings({ project }: { project: Project }) {
  const slug = project.key.toLowerCase();
  const [repositories, setRepositories] = useState<Repository[]>(() => [
    { path: `bit/${slug}-server`, branch: 'main', lastHook: '2시간 전', isHealthy: true },
    { path: `bit/${slug}-client`, branch: 'main', lastHook: '9일 전', isHealthy: false },
  ]);
  return <VStack gap={8}>
    <SettingsHead title="저장소" description={`이 저장소들의 커밋 메시지에서 ${project.key}-42 같은 키를 찾아 작업에 잇습니다.`} />
    <SettingsCard title={`저장소 ${repositories.length}개`} id="repository-list" actions={<Button label="저장소 연결" variant="secondary" size="sm" icon={<NavIcon name="plus" />} />}>
      {repositories.map(repository => <SettingsRow key={repository.path} lead={<NavIcon name="branch" />}
        label={<>{repository.path}{!repository.isHealthy && <> <StatusToken label="웹훅 조용함" color="orange" /></>}</>}
        description={`${repository.branch} · 마지막 웹훅 ${repository.lastHook}`}>
        <IconButton label={`${repository.path} 연결 해제`} tooltip="연결 해제" variant="ghost" size="sm" icon={<NavIcon name="close" />}
          onClick={() => setRepositories(repositories.filter(each => each.path !== repository.path))} />
      </SettingsRow>)}
    </SettingsCard>
  </VStack>;
}
