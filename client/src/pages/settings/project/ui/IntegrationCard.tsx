import { useState } from 'react';
import { Button, Switch, useToast } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { agoText } from '@/shared/lib/date-text';
import { ConfirmDialog, SettingsAction, SettingsCard, SettingsRow } from '@/shared/ui';
import type { Project } from '@/entities/project';
import { disconnectRepository, importOpenIssues, providerName, ProviderMark, refreshIntegrations, reviseIntegration, type Integration } from '@/entities/repository';
import { ConnectDialog } from './ConnectDialog';
import { CopyLine } from './CopyLine';
import styles from './project-settings.module.css';

/**
 * One connected repository (D-087), as Kaneo's connected panel: where it is and whose token speaks for it; the webhook
 * (registered by BIT, or its address and secret to register by hand, with when one last arrived); whether issues are
 * kept in step and whether a mirrored issue is told about it; bringing in the open issues; a new token; and
 * disconnecting. Only those who manage the project change it.
 */
export function IntegrationCard({ project, integration, canManage }: { project: Project; integration: Integration; canManage: boolean }) {
  const client = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [isAsking, setAsking] = useState(false);
  const [isToken, setToken] = useState(false);
  const name = providerName(integration.provider);
  const run = async (key: string, work: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await work();
      await refreshIntegrations(client, project.workspaceId, project.id);
      if (done) toast({ body: done });
    } catch (failure) { toast({ body: authError(failure) }); }
    finally { setBusy(''); }
  };
  const configure = (patch: { syncsIssues?: boolean; commentsLink?: boolean }) =>
    run('configure', () => reviseIntegration(project.workspaceId, project.id, integration.id, { expectedVersion: integration.version, ...patch }));
  const copy = (value: string, what: string) => {
    void navigator.clipboard?.writeText(value).then(() => toast({ body: `${what}을 복사했습니다` }), () => toast({ body: '복사하지 못했습니다' }));
  };
  const heard = integration.lastEventAt ? `마지막으로 받은 웹훅 ${agoText(integration.lastEventAt)}` : '아직 받은 웹훅이 없습니다';
  return <SettingsCard title={`${name} · ${integration.repository}`} id={`integration-${integration.provider}`}>
    <SettingsRow lead={<span className={styles.providerLead}><ProviderMark provider={integration.provider} size="1.25rem" /></span>}
      label={<a className={styles.repoLink} href={integration.webUrl} target="_blank" rel="noreferrer noopener">{integration.repository}</a>}
      description={integration.accountLogin ? `${integration.accountLogin} 계정의 토큰으로 연결했습니다.` : '토큰으로 연결했습니다.'}>
      {canManage && <Button label="토큰 바꾸기" variant="secondary" size="sm" onClick={() => setToken(true)} isDisabled={!!busy} />}
    </SettingsRow>
    {integration.lastError && <SettingsRow label="최근 오류" description={integration.lastError}>
      <span className={styles.errorChip}>확인 필요</span>
    </SettingsRow>}
    {integration.webhookRegistered
      ? <SettingsRow label="웹훅" description={`BIT가 저장소에 자동으로 등록했습니다. ${heard}.`}><span className={styles.okChip}>연결됨</span></SettingsRow>
      : <SettingsRow label="웹훅" isStacked description={`토큰에 웹훅을 등록할 권한이 없어 직접 등록해야 합니다. ${name} 저장소 설정의 Webhooks에서 아래 주소와 비밀값을 넣고, 이벤트는 Push·Pull(Merge) request·Issues·Comments를 고르세요(콘텐츠 형식은 JSON). ${heard}.`}>
        <div className={styles.hookFields}>
          <CopyLine label="주소" value={integration.webhookUrl} onCopy={() => copy(integration.webhookUrl, '웹훅 주소')} />
          {canManage && <CopyLine label={integration.provider === 'gitlab' ? 'Secret token' : 'Secret'} value={integration.webhookSecret} isSecret onCopy={() => copy(integration.webhookSecret, '비밀값')} />}
        </div>
      </SettingsRow>}
    <SettingsRow label="저장소 이슈와 동기화" description="BIT 이슈를 만들면 저장소 이슈가 생기고, 제목·설명·우선순위·라벨·칸과 댓글이 서로 반영됩니다. 끄면 브랜치·PR·커밋 연결만 남습니다.">
      <Switch label="저장소 이슈와 동기화" isLabelHidden size="sm" value={integration.syncsIssues} isDisabled={!canManage || !!busy} onChange={value => { void configure({ syncsIssues: value }); }} />
    </SettingsRow>
    <SettingsRow label="저장소 이슈에 BIT 링크 남기기" description="저장소에서 연 이슈를 BIT가 따라가기 시작하면 그 이슈에 BIT 이슈 링크를 댓글로 남깁니다.">
      <Switch label="저장소 이슈에 BIT 링크 남기기" isLabelHidden size="sm" value={integration.commentsLink} isDisabled={!canManage || !!busy} onChange={value => { void configure({ commentsLink: value }); }} />
    </SettingsRow>
    {canManage && <SettingsRow label="열린 이슈 가져오기" description="저장소의 열린 이슈(최대 200개)와 그 댓글을 BIT 이슈로 가져오고, 열린 PR을 이슈에 잇습니다. 이미 가져온 이슈는 건너뜁니다.">
      <Button label="가져오기" variant="secondary" size="sm" isLoading={busy === 'import'} isDisabled={!!busy && busy !== 'import'}
        onClick={() => { void run('import', async () => {
          const result = await importOpenIssues(project.workspaceId, project.id, integration.id);
          toast({ body: `이슈 ${result.issues}개와 댓글 ${result.comments}개를 가져오고 PR ${result.pullRequests}개를 이었습니다` });
        }); }} />
    </SettingsRow>}
    {canManage && <SettingsRow label="연결 끊기" description="연결과 이슈에 붙은 브랜치·PR·커밋 기록을 지웁니다. 이슈와 저장소 이슈는 그대로 남습니다.">
      <SettingsAction label={`${name} 연결 끊기`} tooltip="연결 끊기" icon="unplug" tone="danger" isDisabled={!!busy} onClick={() => setAsking(true)} />
    </SettingsRow>}
    {isAsking && <ConfirmDialog title={`${name} 연결을 끊을까요?`} description={`${integration.repository}와의 연결과 이슈에 붙은 코드 기록이 지워집니다. 다시 연결하면 새로 쌓입니다.`}
      confirmLabel="연결 끊기" variant="destructive" isPending={busy === 'disconnect'} onClose={() => setAsking(false)}
      onConfirm={() => { void run('disconnect', () => disconnectRepository(project.workspaceId, project.id, integration.id), `${name} 연결을 끊었습니다`).then(() => setAsking(false)); }} />}
    {isToken && <ConnectDialog project={project} provider={integration.provider} integration={integration} onClose={saved => { setToken(false); if (saved) toast({ body: '토큰을 바꿨습니다' }); }} />}
  </SettingsCard>;
}

