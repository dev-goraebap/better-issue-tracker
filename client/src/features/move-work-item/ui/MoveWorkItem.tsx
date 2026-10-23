import { useState } from 'react';
import { Button, Selector, Text } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardColumn } from '@/entities/project';
import { moveItem, refreshItems, type WorkItem } from '@/entities/work-item';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
export function MoveWorkItem({ item, columns, disabled = false }: { item: WorkItem; columns: BoardColumn[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false); const [column, setColumn] = useState(''); const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  function begin() { setColumn(item.columnId ?? ''); setVersion(item.version); setError(''); setOpen(true); }
  async function save() { if (busy) return; setBusy(true); setError(''); try { await moveItem(item.workspaceId, item.projectId, item.id, { expectedVersion: version, targetColumnId: column || null }); setOpen(false); } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshItems(client, item.workspaceId, item.projectId); }
  return <><Button label="이동" size="sm" variant="ghost" onClick={begin} isDisabled={disabled} />
    <CompactDialog isOpen={open} title={`${item.key} 이동`} isBusy={busy} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} footer={<><Button label="취소" variant="ghost" onClick={() => setOpen(false)} isDisabled={busy} /><Button type="submit" label="이동" variant="primary" isLoading={busy} /></>}>
      <Text>{item.title}</Text><Selector label="목적 컬럼" value={column} onChange={setColumn} options={[{ value: '', label: '백로그' }, ...columns.map(c => ({ value: c.id, label: c.name }))]} isDisabled={busy} /><FormMessage message={error} />
    </CompactDialog></>;
}
