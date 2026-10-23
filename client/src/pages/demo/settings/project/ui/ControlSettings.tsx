import { useState } from 'react';
import { SegmentedControl, SegmentedControlItem, Switch, VStack } from '@astryxdesign/core';
import { NavIcon, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';

/**
 * 통제: how tightly the project is held (AGENTS 원칙 5), 개인 모드 (light: anyone who may write changes anything) or
 * 팀 모드, whose rules show only while it is chosen, each a switch that applies at once.
 */
export function ControlSettings({ project: _project }: { project: Project }) {
  const [mode, setMode] = useState<'personal' | 'team'>('personal');
  const [rules, setRules] = useState({ decisions: true, artifacts: true, review: false });
  return <VStack gap={8}>
    <SettingsHead title="통제" description="혼자 쓰면 개인 모드, 여럿이 확정본을 지켜야 하면 팀 모드를 고릅니다." />
    <SettingsCard title="모드" id="control-mode">
      <SettingsRow label="통제 강도" description={mode === 'personal' ? '쓸 수 있는 사람은 무엇이든 바로 고칩니다.' : '아래 규칙이 확정본과 완료를 지킵니다.'}>
        <SegmentedControl label="통제 강도" size="sm" value={mode} onChange={value => setMode(value as typeof mode)}>
          <SegmentedControlItem value="personal" label="개인" icon={<NavIcon name="person" />} />
          <SegmentedControlItem value="team" label="팀" icon={<NavIcon name="members" />} />
        </SegmentedControl>
      </SettingsRow>
    </SettingsCard>
    {mode === 'team' && <SettingsCard title="팀 모드 규칙" id="control-rules">
      <SettingsRow label="확정된 결정 잠금" description="확정된 결정은 관리자만 고치고, 바꾸려면 새 결정으로 대체합니다.">
        <Switch label="확정된 결정 잠금" isLabelHidden value={rules.decisions} onChange={value => setRules({ ...rules, decisions: value })} />
      </SettingsRow>
      <SettingsRow label="산출물 확정본 잠금" description="확정한 버전은 고칠 수 없고, 개정 사유를 단 새 버전으로만 바꿉니다.">
        <Switch label="산출물 확정본 잠금" isLabelHidden value={rules.artifacts} onChange={value => setRules({ ...rules, artifacts: value })} />
      </SettingsRow>
      <SettingsRow label="완료 전 검토" description="작업을 완료 칸으로 옮기려면 다른 사람의 승인이 필요합니다.">
        <Switch label="완료 전 검토" isLabelHidden value={rules.review} onChange={value => setRules({ ...rules, review: value })} />
      </SettingsRow>
    </SettingsCard>}
  </VStack>;
}
