import { useState } from 'react';
import { Button, Selector, Text } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { projectPath, refreshProjects, type Project, type BoardColumn } from '@/entities/project';
import { authError, command } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
export function ColumnDelete({ project, column, columns }: { project: Project; column: BoardColumn; columns: BoardColumn[] }) {
  const [open, setOpen] = useState(false); const [target, setTarget] = useState('backlog'); const [version, setVersion] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  return <><Button label="삭제" variant="ghost" size="sm" isDisabled={!!project.archivedAt || columns.length < 2} onClick={() => { setTarget('backlog'); setVersion(column.version); setError(''); setOpen(true); }} />
    <CompactDialog isOpen={open} title={`${column.name} 컬럼 삭제`} isBusy={busy} onClose={() => setOpen(false)} footer={<><Button label="취소" variant="ghost" isDisabled={busy} onClick={() => setOpen(false)} /><Button label="이동 후 컬럼 삭제" variant="primary" isLoading={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await command('DELETE', `${projectPath(project.workspaceId, project.id)}/columns/${column.id}?expectedVersion=${version}&moveTo=${encodeURIComponent(target)}`); setOpen(false); } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshProjects(client, project.workspaceId); }} /></>}>
      <Text>보관된 작업을 포함한 모든 작업을 선택한 곳으로 옮깁니다. 이미 삭제된 작업은 나중에 복원할 때 백로그로 돌아갑니다.</Text><Selector label="작업을 옮길 곳" value={target} onChange={setTarget} options={[{ value: 'backlog', label: '백로그' }, ...columns.filter(c => c.id !== column.id).map(c => ({ value: c.id, label: c.name }))]} isDisabled={busy} /><FormMessage message={error} />
    </CompactDialog></>;
}
