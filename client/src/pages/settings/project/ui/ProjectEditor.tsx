import { useState } from 'react';
import { Button, HStack, TextArea, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { projectPath, refreshProjects, type Project } from '@/entities/project';
import { authError, command, type components } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
export function ProjectEditor({ project, onClose }: { project: Project; onClose: () => void }) {
  const [name, setName] = useState(project.name); const [key, setKey] = useState(project.key); const [description, setDescription] = useState(project.description ?? ''); const [version] = useState(project.version);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  return <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const body: components['schemas']['UpdateProject'] = { expectedVersion: version, name: name.trim(), key: key.trim(), description: description.trim() || null }; await command('PATCH', projectPath(project.workspaceId, project.id), body); }
    catch (failure) { setError(authError(failure)); setBusy(false); await refreshProjects(client, project.workspaceId); return; }
    setBusy(false); onClose(); await refreshProjects(client, project.workspaceId);
  }}><VStack gap={4}><TextInput placeholder="예: 제품 개발" label="프로젝트 이름" value={name} onChange={setName} isRequired isDisabled={busy} /><TextInput label="프로젝트 키" value={key} onChange={v => setKey(v.toUpperCase())} isRequired isDisabled={busy} description="이전 키는 별칭으로 남아 계속 인식됩니다." /><TextArea placeholder="목적과 필요한 맥락을 적어 주세요" label="설명" value={description} onChange={setDescription} rows={4} maxLength={20000} isDisabled={busy} /><FormMessage message={error} /><HStack gap={3} data-action-row><Button label="취소" variant="ghost" onClick={onClose} isDisabled={busy} /><Button label="프로젝트 저장" type="submit" variant="primary" isLoading={busy} /></HStack></VStack></form>;
}
