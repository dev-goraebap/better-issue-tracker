import { useState } from 'react';
import { Button, HStack, Popover, Selector, TextInput, VStack } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PRIORITIES, TRIGGERS } from '@/entities/work-item';
import { memberOptionsQuery } from '@/entities/workspace';
import type { BoardColumn } from '@/entities/project';
import { DateField, QueryMessage } from '@/shared/ui';
import { emptyTaskSearch, parseTaskSearch, type TaskSearch } from '../model/search';
import styles from './task-filters.module.css';
export function TaskFilters({ workspaceId, value, columns = [], onChange, canWrite, mine = false, board = false }: { workspaceId: string; value: TaskSearch; columns?: BoardColumn[]; onChange: (value: TaskSearch) => void; canWrite: boolean; mine?: boolean; board?: boolean }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(value); const members = useInfiniteQuery({ ...memberOptionsQuery(workspaceId), enabled: open && !mine }); const people = members.data?.pages.flatMap(page => page.items) ?? [];
  const change = (key: keyof TaskSearch, next: string) => setDraft(previous => parseTaskSearch({ ...previous, [key]: next }));
  return <Popover isOpen={open} onOpenChange={next => { if (next) setDraft(parseTaskSearch({ ...value })); setOpen(next); }} placement="below" alignment="end" width={340} label="작업 필터" content={<form className={styles.panel} onSubmit={event => { event.preventDefault(); onChange(parseTaskSearch({ ...draft })); setOpen(false); }}><VStack gap={4}>
    <TextInput placeholder="찾을 작업 제목" label="제목 검색" value={draft.q} onChange={v => change('q', v)} />
    <Selector label="표시할 작업" value={draft.mode} onChange={v => change('mode', v)} options={[{ value: 'active', label: '보관·삭제 제외' }, { value: 'archived', label: '보관' }, ...(canWrite ? [{ value: 'deleted', label: '삭제' }] : [])]} />
    <Selector label="우선순위" value={draft.priority} onChange={v => change('priority', v)} options={[{ value: '', label: '전체' }, ...Object.entries(PRIORITIES).map(([v, label]) => ({ value: v, label }))]} />
    <Selector label="트리거" value={draft.triggerType} onChange={v => change('triggerType', v)} options={[{ value: '', label: '전체' }, ...Object.entries(TRIGGERS).map(([v, label]) => ({ value: v, label }))]} />
    {!mine && <><Selector label="담당자" value={draft.assigneeId} onChange={v => change('assigneeId', v)} options={[{ value: '', label: '전체' }, ...(draft.assigneeId && !people.some(p => p.userId === draft.assigneeId) ? [{ value: draft.assigneeId, label: '선택한 담당자' }] : []), ...people.map(p => ({ value: p.userId, label: p.name }))]} hasSearch /><QueryMessage pending={members.isPending} error={members.error} retry={() => { void members.refetch(); }} />{members.hasNextPage && <Button label="멤버 더 불러오기" onClick={() => { void members.fetchNextPage(); }} isLoading={members.isFetchingNextPage} />}</>}
    {!!columns.length && !board && <Selector label="컬럼" value={draft.column} onChange={v => change('column', v)} options={[{ value: '', label: '전체' }, { value: 'backlog', label: '백로그' }, ...columns.map(c => ({ value: c.id, label: c.name }))]} />}
    <Selector label="완료 여부" value={draft.closed} onChange={v => change('closed', v)} options={[{ value: '', label: '전체' }, { value: 'false', label: '미완료' }, { value: 'true', label: '완료' }]} />
    <DateField label="마감일 이후" hasClear value={draft.from || undefined} onChange={v => change('from', v ?? '')} /><DateField label="마감일 이전" hasClear value={draft.to || undefined} onChange={v => change('to', v ?? '')} />
    {!board && <Selector label="정렬" value={draft.order} onChange={v => change('order', v)} options={[{ value: 'createdAt_desc', label: '최근 생성순' }, { value: 'createdAt_asc', label: '먼저 생성순' }, ...(!mine ? [{ value: 'position_asc', label: '보드 순서' }] : [])]} />}
    <HStack gap={3} className={styles.footer} data-action-row><Button label="초기화" variant="ghost" onClick={() => setDraft(emptyTaskSearch())} /><Button label="필터 적용" type="submit" variant="primary" /></HStack>
  </VStack></form>}><Button label="필터" variant="secondary" size="sm" /></Popover>;
}
