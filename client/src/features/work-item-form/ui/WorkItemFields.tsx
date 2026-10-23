import { Button, Selector, TextArea, TextInput, VStack } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { memberOptionsQuery } from '@/entities/workspace';
import { PRIORITIES, TRIGGERS } from '@/entities/work-item';
import { DateField, QueryMessage } from '@/shared/ui';
import type { WorkItemDraft } from '../model/draft';
import styles from './work-item-fields.module.css';
export function WorkItemFields({ workspaceId, value, onChange, disabled = false }: { workspaceId: string; value: WorkItemDraft; onChange: (value: WorkItemDraft) => void; disabled?: boolean }) {
  const members = useInfiniteQuery(memberOptionsQuery(workspaceId)); const people = members.data?.pages.flatMap(page => page.items) ?? [];
  const update = <K extends keyof WorkItemDraft>(key: K, next: WorkItemDraft[K]) => onChange({ ...value, [key]: next });
  return <VStack gap={4}>
    <TextInput placeholder="예: 로그인 오류 수정" label="제목" value={value.title} onChange={text => update('title', text)} isRequired isDisabled={disabled} />
    <TextArea placeholder="목적과 필요한 맥락을 적어 주세요" label="설명" value={value.description ?? ''} onChange={text => update('description', text)} rows={5} maxLength={20000} isDisabled={disabled} description="Markdown으로 작성할 수 있습니다." />
    <section className={styles.grid}>
      <Selector label="우선순위" value={value.priority ?? ''} onChange={v => update('priority', v ? v as WorkItemDraft['priority'] : null)} options={[{ value: '', label: '지정 안 함' }, ...Object.entries(PRIORITIES).map(([v, label]) => ({ value: v, label }))]} isDisabled={disabled} />
      <Selector label="트리거" value={value.triggerType ?? ''} onChange={v => update('triggerType', v ? v as WorkItemDraft['triggerType'] : null)} options={[{ value: '', label: '지정 안 함' }, ...Object.entries(TRIGGERS).map(([v, label]) => ({ value: v, label }))]} isDisabled={disabled} />
      <Selector label="담당자" value={value.assigneeId ?? ''} onChange={v => update('assigneeId', v || null)} options={[{ value: '', label: '담당자 없음' }, ...(value.assigneeId && !people.some(p => p.userId === value.assigneeId) ? [{ value: value.assigneeId, label: '현재 담당자 (목록에 없음)' }] : []), ...people.map(p => ({ value: p.userId, label: p.name }))]} isDisabled={disabled || members.isPending} hasSearch />
      <section><QueryMessage pending={members.isPending} error={members.error} retry={() => { void members.refetch(); }} />{members.hasNextPage && <Button label="멤버 더 불러오기" onClick={() => { void members.fetchNextPage(); }} isLoading={members.isFetchingNextPage} />}</section>
      <DateField label="시작일" hasClear value={value.startDate ?? undefined} onChange={v => update('startDate', v || null)} isDisabled={disabled} />
      <DateField label="마감일" hasClear value={value.dueDate ?? undefined} onChange={v => update('dueDate', v || null)} isDisabled={disabled} />
    </section>
  </VStack>;
}
