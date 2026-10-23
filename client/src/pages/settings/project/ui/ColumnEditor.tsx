import { useState } from 'react';
import { Button, Selector, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { projectPath, refreshProjects, type Project, type BoardColumn } from '@/entities/project';
import { authError, command, type components } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
export function ColumnEditor({ project, column }: { project: Project; column?: BoardColumn }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [color, setColor] = useState(''); const [final, setFinal] = useState('false'); const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  function begin() { setName(column?.name ?? ''); setColor(column?.color ?? ''); setFinal(column?.isFinal ? 'true' : 'false'); setVersion(column?.version ?? project.version); setError(''); setOpen(true); }
  async function save() { if (busy) return; setBusy(true); setError(''); try {
    const body: components['schemas']['CreateBoardColumn'] = { expectedVersion: version, name: name.trim(), color: color || null, isFinal: final === 'true' };
    await command(column ? 'PATCH' : 'POST', `${projectPath(project.workspaceId, project.id)}/columns${column ? `/${column.id}` : ''}`, body); setOpen(false);
  } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshProjects(client, project.workspaceId); }
  return <><Button label={column ? '편집' : '컬럼 추가'} variant="ghost" size="sm" onClick={begin} isDisabled={!!project.archivedAt} /><CompactDialog isOpen={open} title={column ? '컬럼 편집' : '컬럼 추가'} isBusy={busy} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} footer={<><Button label="취소" variant="ghost" onClick={() => setOpen(false)} isDisabled={busy} /><Button type="submit" label="컬럼 저장" variant="primary" isLoading={busy} isDisabled={!name.trim() || (!!color && !/^#[0-9a-fA-F]{6}$/.test(color))} /></>}>
    <TextInput placeholder="예: 검토 중" label="컬럼 이름" value={name} onChange={setName} isRequired isDisabled={busy} /><TextInput label="색상" value={color} onChange={setColor} placeholder="#6B7280" isDisabled={busy} description="선택 사항. #RRGGBB 형식으로 입력합니다." /><Selector label="완료 컬럼" value={final} onChange={setFinal} options={[{ value: 'false', label: '아니요' }, { value: 'true', label: '예' }]} isDisabled={busy} /><FormMessage message={error} />
  </CompactDialog></>;
}
