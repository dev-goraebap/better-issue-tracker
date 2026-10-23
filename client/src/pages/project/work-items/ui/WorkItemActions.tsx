import { useState } from 'react';
import { Button, HStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { MoveWorkItem } from '@/features/move-work-item';
import { itemPath, refreshItems, type WorkItem } from '@/entities/work-item';
import type { BoardColumn } from '@/entities/project';
import { authError, command } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
export function WorkItemActions({ item, columns, disabled = false }: { item: WorkItem; columns: BoardColumn[]; disabled?: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  return <><HStack gap={1}>{item.deletedAt ? <Button label="복원" size="sm" isLoading={busy} isDisabled={disabled} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await command('POST', `${itemPath(item.workspaceId, item.projectId, item.id)}/restore`, { expectedVersion: item.version }); } catch (failure) { setError(authError(failure)); } await refreshItems(client, item.workspaceId, item.projectId); setBusy(false); }} /> : <MoveWorkItem item={item} columns={columns} disabled={disabled} />}</HStack><FormMessage message={error} /></>;
}
