import { useState } from 'react';
import { Button, Switch, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage, Select } from '@/shared/ui';
import { createColumn, refreshProjects, updateColumn, type BoardColumn, type Project } from '@/entities/project';

const CATEGORIES = [{ value: 'backlog', label: '백로그' }, { value: 'todo', label: '할 일' }, { value: 'doing', label: '진행 중' }, { value: 'done', label: '완료' }, { value: 'canceled', label: '취소' }] as const;
type Category = BoardColumn['category'];

/**
 * A board column made or changed (짧은 창): its name, its category (백로그·할 일·진행 중·완료·취소, how 전체 groups it,
 * D-111) and whether it closes work. A closing column is 완료 or 취소, and 취소 always closes: turning 완료 상태 on makes
 * any other category 완료, and choosing 취소 turns it on for good.
 */
export function ColumnDialog({ project, column, onClose }: { project: Project; column?: BoardColumn; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(column?.name ?? '');
  const [category, setCategory] = useState<Category>(column?.category ?? 'doing');
  const [isFinal, setFinal] = useState(column?.isFinal ?? false);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameError = isChecked && !name.trim() ? '상태 이름을 입력해 주세요.' : undefined;
  const save = async () => {
    setChecked(true);
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      const closes = isFinal || category === 'canceled';
      const finalCategory = closes && category !== 'canceled' ? 'done' as const : category;
      if (column) await updateColumn(project.workspaceId, project.id, column.id, { expectedVersion: column.version, name: name.trim(), isFinal: closes, category: finalCategory });
      else await createColumn(project.workspaceId, project.id, { expectedVersion: project.version, name: name.trim(), isFinal: closes, category: finalCategory });
      await refreshProjects(client, project.workspaceId);
      onClose();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog isOpen title={column ? '상태 고치기' : '상태 추가'} width={520} isBusy={isBusy} onClose={() => { if (!isBusy) onClose(); }} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button className={column ? undefined : "bit-create-action"} type="submit" label={column ? '저장' : '상태 추가'} variant="primary" isLoading={isBusy} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 검토 중" status={nameError ? { type: 'error', message: nameError } : undefined} />
    <Select label="분류" options={(isFinal ? CATEGORIES.filter(each => each.value === 'done' || each.value === 'canceled') : [...CATEGORIES])}
      value={isFinal && category !== 'canceled' ? 'done' : category} onChange={value => setCategory((value ?? 'doing') as Category)} isDisabled={isBusy}
      description="전체 보드에서 이 상태의 업무가 놓일 곳입니다." />
    <Switch label="완료 상태" description="이 상태로 옮기면 업무가 닫힙니다. 취소는 늘 닫힙니다." value={isFinal || category === 'canceled'}
      onChange={setFinal} isDisabled={isBusy || category === 'canceled'} />
    <FormMessage message={error} />
  </CompactDialog>;
}
