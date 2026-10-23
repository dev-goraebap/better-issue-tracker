import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { ConfirmDialog, NavIcon, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import type { Workspace } from '@/entities/demo-sample';
import styles from './workspace-settings.module.css';

/**
 * 연동: the Git server the workspace's projects read commits and merge requests from (referenced, never hosted: AGENTS 원칙 1),
 * and the webhook address and secret to paste into it. Shown only while the server has Git on (D-030); 연결 해제 asks
 * first, as the projects' repositories stop updating.
 */
export function IntegrationsSettings({ workspace }: { workspace: Workspace }) {
  const [isConnected, setConnected] = useState(true);
  const [isLeaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const hook = `https://bit.local/api/hooks/git/${workspace.id}`;
  const copy = () => { void navigator.clipboard?.writeText(hook).catch(() => undefined); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return <VStack gap={8}>
    <SettingsHead title="연동" description="커밋과 MR을 작업 키(BIT-42)로 잇습니다. 저장소는 프로젝트 설정에서 고릅니다." />
    <SettingsCard title="Git 서버" id="integrations-git">
      <SettingsRow lead={<NavIcon name="branch" />} label={<>GitLab {isConnected ? <StatusToken label="연결됨" color="green" /> : <StatusToken label="연결 안 됨" />}</>}
        description={isConnected ? 'gitlab.bit.local · 연결한 사람 고재범' : '연결하면 프로젝트마다 저장소를 고를 수 있습니다.'}>
        {isConnected
          ? <Button label="연결 해제" variant="ghost" size="sm" onClick={() => setLeaving(true)} />
          : <Button label="연결" variant="secondary" size="sm" onClick={() => setConnected(true)} />}
      </SettingsRow>
    </SettingsCard>
    {isConnected && <SettingsCard title="웹훅" id="integrations-hook">
      <SettingsRow label="주소" description={<code className={styles.code}>{hook}</code>}>
        <Button label={copied ? '복사됨' : '복사'} variant="secondary" size="sm" icon={<NavIcon name={copied ? 'check' : 'copy'} />} onClick={copy} />
      </SettingsRow>
      <SettingsRow label="비밀 토큰" description="만든 날 2026년 9월 2일">
        <Button label="다시 만들기" variant="ghost" size="sm" />
      </SettingsRow>
    </SettingsCard>}
    {isLeaving && <ConfirmDialog title="GitLab 연결을 끊을까요?" description="프로젝트 저장소에 새 커밋과 MR이 더 이어지지 않습니다. 이미 이어진 기록은 남습니다."
      confirmLabel="연결 해제" variant="destructive" onClose={() => setLeaving(false)} onConfirm={() => { setConnected(false); setLeaving(false); }} />}
  </VStack>;
}
