import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { capabilitiesQueryOptions } from '@/shared/api';
import { PageState, QueryMessage, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import type { Project } from '@/entities/project';
import { integrationsQuery, PROVIDERS, ProviderMark, type Provider } from '@/entities/repository';
import { ConnectDialog } from './ConnectDialog';
import { IntegrationCard } from './IntegrationCard';
import { IntegrationRules } from './IntegrationRules';
import styles from './project-settings.module.css';

/**
 * 저장소 연동 (D-087), as Kaneo's Integrations: GitHub, GitLab and Gitea each a row to connect with a token, one
 * repository per host; a connected one gets its own card below (IntegrationCard), then the column each repository event
 * moves a work item to (IntegrationRules). When the server has no encryption key the feature is off and says so (D-030).
 */
export function IntegrationSettings({ project, canManage }: { project: Project; canManage: boolean }) {
  const capabilities = useQuery(capabilitiesQueryOptions);
  const integrations = useQuery(integrationsQuery(project.workspaceId, project.id));
  const [connecting, setConnecting] = useState<Provider | null>(null);
  if (capabilities.data && !capabilities.data.gitIntegration)
    return <PageState kind="empty" title="저장소 연동이 꺼져 있습니다" description="서버에 암호화 키(GIT_ENCRYPTION_KEY)가 없어 토큰을 보관할 수 없습니다. 인스턴스 관리자에게 문의해 주세요." />;
  const connected = integrations.data ?? [];
  return <VStack gap={8}>
    <SettingsHead title="저장소 연동" description={`${project.name} 프로젝트를 GitHub·GitLab·Gitea 저장소와 잇습니다. 업무 키(${project.key}-42)를 단 브랜치·PR·커밋이 업무에 붙어 칸을 옮기고, 업무는 저장소 이슈와 서로 반영됩니다.`} />
    <SettingsCard title="호스트" id="integration-hosts">
      {!integrations.data ? <QueryMessage pending={integrations.isPending} error={integrations.error} retry={() => { void integrations.refetch(); }} />
        : PROVIDERS.map(host => {
          const integration = connected.find(each => each.provider === host.value);
          return <SettingsRow key={host.value} lead={<span className={styles.providerLead}><ProviderMark provider={host.value} size="1.25rem" /></span>}
            label={host.name} description={integration ? `${integration.repository}에 연결됨` : host.hint}>
            {integration ? <span className={styles.okChip}>연결됨</span>
              : canManage ? <Button label="연결" variant="secondary" size="sm" onClick={() => setConnecting(host.value)} /> : <span className={styles.mutedChip}>연결 안 됨</span>}
          </SettingsRow>;
        })}
    </SettingsCard>
    {connected.map(integration => <IntegrationCard key={integration.id} project={project} integration={integration} canManage={canManage} />)}
    {connected.length > 0 && <IntegrationRules project={project} canManage={canManage} />}
    {connecting && <ConnectDialog project={project} provider={connecting} onClose={() => setConnecting(null)} />}
  </VStack>;
}
