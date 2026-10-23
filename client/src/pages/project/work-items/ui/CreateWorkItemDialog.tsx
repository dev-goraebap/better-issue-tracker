import { useState } from 'react';
import { Button, Selector } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createItem, refreshItems } from '@/entities/work-item';
import type { BoardColumn } from '@/entities/project';
import { WorkItemFields, emptyDraft, draftPayload } from '@/features/work-item-form';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
export function CreateWorkItemDialog({ workspaceId, projectId, columns, open, initialColumn, onClose }: { workspaceId: string; projectId: string; columns: BoardColumn[]; open: boolean; initialColumn: string | null; onClose: () => void }) {
  const [draft, setDraft] = useState(emptyDraft); const [column, setColumn] = useState<string | undefined>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient(); const navigate = useNavigate();
  const selected = column ?? initialColumn ?? '';
  function reset() { setDraft(emptyDraft()); setColumn(undefined); setError(''); onClose(); }
  function close() { if (!busy) reset(); }
  async function save() {
    if (busy) return; setBusy(true); setError(''); let id: string;
    try { id = await createItem(workspaceId, projectId, { ...draftPayload(draft), columnId: selected || null }); }
    catch (failure) { setError(authError(failure)); setBusy(false); return; }
    setBusy(false); reset(); await refreshItems(client, workspaceId, projectId); void navigate({ href: `/w/${workspaceId}/p/${projectId}/work-items/${id}` });
  }
  return <CompactDialog isOpen={open} title="작업 만들기" width={640} isBusy={busy} onClose={close} onSubmit={() => { void save(); }} footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={busy} /><Button type="submit" label="작업 만들기" variant="primary" isLoading={busy} isDisabled={!draft.title.trim()} /></>}>
    <Selector label="컬럼" value={selected} onChange={setColumn} options={[{ value: '', label: '백로그' }, ...columns.map(c => ({ value: c.id, label: c.name }))]} isDisabled={busy} />
    <WorkItemFields workspaceId={workspaceId} value={draft} onChange={setDraft} disabled={busy} /><FormMessage message={error} />
  </CompactDialog>;
}
