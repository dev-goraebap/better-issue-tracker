import { useState } from 'react';
import { Button, HStack, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { columnsQuery, projectPath, refreshProjects, type Project } from '@/entities/project';
import { authError, command, type components } from '@/shared/api';
import { FormMessage, QueryMessage, SectionHeader } from '@/shared/ui';
import { ColumnEditor } from './ColumnEditor';
import { ColumnDelete } from './ColumnDelete';
export function ProjectColumns({ project, canManage }: { project: Project; canManage: boolean }) {
  const columns = useQuery(columnsQuery(project.workspaceId, project.id)); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  async function reorder(index: number, offset: number) { if (busy || !columns.data) return; const order = columns.data.map(c => c.id); [order[index], order[index + offset]] = [order[index + offset], order[index]]; setBusy(true); setError(''); try { const body: components['schemas']['ReorderBoardColumns'] = { expectedVersion: project.version, order }; await command('POST', `${projectPath(project.workspaceId, project.id)}/columns/reorder`, body); } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshProjects(client, project.workspaceId); }
  return <VStack gap={4}><HStack gap={4}><SectionHeader title="보드 컬럼" />{canManage && <ColumnEditor project={project} />}</HStack><QueryMessage pending={columns.isPending} error={columns.error} retry={() => { void columns.refetch(); }} /><FormMessage message={error} />
    {columns.data?.map((column, index) => <HStack key={column.id} gap={3} wrap="wrap"><Text weight="medium">{column.name}{column.isFinal ? ' · 완료' : ''}</Text>{canManage && <><Button label={`${column.name} 위로`} size="sm" variant="ghost" isDisabled={busy || !!project.archivedAt || index === 0} onClick={() => { void reorder(index, -1); }} /><Button label={`${column.name} 아래로`} size="sm" variant="ghost" isDisabled={busy || !!project.archivedAt || index === columns.data.length - 1} onClick={() => { void reorder(index, 1); }} /><ColumnEditor project={project} column={column} /><ColumnDelete project={project} column={column} columns={columns.data} /></>}</HStack>)}
  </VStack>;
}
