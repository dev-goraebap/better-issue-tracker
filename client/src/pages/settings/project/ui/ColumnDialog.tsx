import { useState } from 'react';
import { Button, Switch, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage, Select } from '@/shared/ui';
import { createColumn, refreshProjects, updateColumn, type BoardColumn, type Project } from '@/entities/project';

const CATEGORIES = [{ value: 'todo', label: '할 일' }, { value: 'doing', label: '진행 중' }, { value: 'done', label: '완료' }] as const;
type Category = BoardColumn['category'];

/**
 * A board column made or changed (짧은 창): its name, its category (할 일·진행 중·완료, how 전체 groups it, D-066) and
 * whether it finishes work. A finishing column is always 완료 (D-072), so turning it on sets the category and the
 * category waits until it is off again.
 */
export function ColumnDialog({ project, column, onClose }: { project: Project; column?: BoardColumn; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(column?.name ?? '');
  const [category, setCategory] = useState<Category>(column?.category ?? 'doing');
  const [isFinal, setFinal] = useState(column?.isFinal ?? false);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameError = isChecked && !name.trim() ? '칸 이름을 입력해 주세요.' : undefined;
  const save = async () => {
    setChecked(true);
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      const finalCategory = isFinal ? 'done' as const : category;
      if (column) await updateColumn(project.workspaceId, project.id, column.id, { expectedVersion: column.version, name: name.trim(), isFinal, category: finalCategory });
      else await createColumn(project.workspaceId, project.id, { expectedVersion: project.version, name: name.trim(), isFinal, category: finalCategory });
      await refreshProjects(client, project.workspaceId);
      onClose();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog isOpen title={column ? '칸 고치기' : '새 칸'} width={520} isBusy={isBusy} onClose={() => { if (!isBusy) onClose(); }} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button type="submit" label={column ? '저장' : '칸 만들기'} variant="primary" isLoading={isBusy} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 검토 중" status={nameError ? { type: 'error', message: nameError } : undefined} />
    <Select label="분류" options={[...CATEGORIES]} value={isFinal ? 'done' : category} onChange={value => setCategory((value ?? 'doing') as Category)} isDisabled={isBusy || isFinal}
      description="전체 보드에서 이 칸의 업무가 놓일 곳입니다." />
    <Switch label="완료 칸" value={isFinal} onChange={setFinal} isDisabled={isBusy} />
    <FormMessage message={error} />
  </CompactDialog>;
}
