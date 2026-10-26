import { useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { QueryMessage, Select, SettingsCard, SettingsRow } from '@/shared/ui';
import { columnsQuery, type Project } from '@/entities/project';
import { integrationsKey, rulesQuery, setRules, type RuleEvent } from '@/entities/repository';

const EVENTS: readonly { event: RuleEvent; label: string; description: string }[] = [
  { event: 'branch_push', label: '브랜치를 올리면', description: '이슈 키(예: bit-42-…)가 든 브랜치가 처음 올라올 때. 시작 전 이슈만 옮깁니다.' },
  { event: 'pr_opened', label: 'PR을 열면', description: '이슈 키나 연결된 저장소 이슈(Closes #12)를 단 PR·MR이 열리거나 초안에서 풀릴 때. 앞쪽 칸으로만 옮깁니다.' },
  { event: 'pr_merged', label: 'PR이 병합되면', description: '그 PR·MR이 병합될 때.' },
  { event: 'issue_opened', label: '저장소 이슈가 열리면', description: '저장소에서 연 이슈를 BIT로 들여올 때, 닫힌 이슈가 다시 열릴 때.' },
  { event: 'issue_closed', label: '저장소 이슈가 닫히면', description: '이어진 저장소 이슈가 닫힐 때.' },
];
const STAY = 'stay';
const DEFAULT = 'default';

/**
 * The column each repository event moves an issue to, as Kaneo's workflow rules (D-087): left at 기본, the column of the
 * fitting kind (the first 진행 중 for a branch, the last for a pull request, the 완료 column for a merge or a close);
 * or any column; or 옮기지 않음.
 */
export function IntegrationRules({ project, canManage }: { project: Project; canManage: boolean }) {
  const client = useQueryClient();
  const toast = useToast();
  const rules = useQuery(rulesQuery(project.workspaceId, project.id));
  const columns = useQuery(columnsQuery(project.workspaceId, project.id));
  const [busy, setBusy] = useState<RuleEvent | null>(null);
  const nameOf = (id: string | null) => columns.data?.find(column => column.id === id)?.name;
  const choose = async (event: RuleEvent, value: string) => {
    setBusy(event);
    try {
      const items = await setRules(project.workspaceId, project.id, [{ event, set: value !== DEFAULT, columnId: value === DEFAULT || value === STAY ? null : value }]);
      client.setQueryData(rulesQuery(project.workspaceId, project.id).queryKey, items.items);
    } catch (failure) {
      toast({ body: authError(failure) });
      await client.invalidateQueries({ queryKey: integrationsKey(project.workspaceId, project.id) });
    } finally { setBusy(null); }
  };
  return <SettingsCard title="이벤트별 칸 이동" id="integration-rules">
    {!rules.data || !columns.data ? <QueryMessage pending={rules.isPending || columns.isPending} error={rules.error ?? columns.error} retry={() => { void rules.refetch(); void columns.refetch(); }} />
      : EVENTS.map(({ event, label, description }) => {
        const rule = rules.data.find(each => each.event === event);
        const value = !rule?.set ? DEFAULT : rule.columnId ?? STAY;
        const fallback = nameOf(rule?.defaultColumnId ?? null);
        return <SettingsRow key={event} label={label} description={description}>
          <Select label={label} isLabelHidden size="sm" width={180} value={value} isDisabled={!canManage || busy !== null}
            options={[
              { value: DEFAULT, label: fallback ? `기본 · ${fallback}` : '기본 · 옮기지 않음' },
              ...columns.data.map(column => ({ value: column.id, label: column.name })),
              { value: STAY, label: '옮기지 않음' },
            ]}
            onChange={next => { if (next && next !== value) void choose(event, next); }} />
        </SettingsRow>;
      })}
  </SettingsCard>;
}
