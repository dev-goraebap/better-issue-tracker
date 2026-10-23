import { useState } from 'react';
import { Button, HStack, Text, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { itemPath, refreshItems, type WorkItem } from '@/entities/work-item';
import { WorkItemFields, draftPayload, type WorkItemDraft } from '@/features/work-item-form';
import { authError, command } from '@/shared/api';
import type { components } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
export function WorkItemEditor({ item, onClose, onSaved }: { item: WorkItem; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<WorkItemDraft>(() => ({ title: item.title, description: item.description, priority: item.priority, triggerType: item.triggerType, assigneeId: item.assigneeId, startDate: item.startDate, dueDate: item.dueDate }));
  const [baseVersion] = useState(item.version); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  return <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const body: components['schemas']['UpdateWorkItem'] = { ...draftPayload(draft), expectedVersion: baseVersion }; await command('PATCH', itemPath(item.workspaceId, item.projectId, item.id), body); }
    catch (failure) { setError(authError(failure)); setBusy(false); await refreshItems(client, item.workspaceId, item.projectId); return; }
    setBusy(false); onSaved(); await refreshItems(client, item.workspaceId, item.projectId);
  }}><VStack gap={5}>
    {baseVersion !== item.version && <Text color="secondary">서버에 새로운 변경이 있습니다. 입력 중인 초안은 유지됩니다.</Text>}
    <WorkItemFields workspaceId={item.workspaceId} value={draft} onChange={setDraft} disabled={busy} /><FormMessage message={error} />
    <HStack gap={3} data-action-row><Button label="취소" variant="ghost" onClick={onClose} isDisabled={busy} /><Button type="submit" label="변경 저장" variant="primary" isLoading={busy} isDisabled={!draft.title.trim()} /></HStack>
  </VStack></form>;
}
