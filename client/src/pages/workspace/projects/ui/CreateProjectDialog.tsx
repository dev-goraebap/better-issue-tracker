import { useState } from 'react';
import { Button, Text, TextArea, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createProject, refreshProjects } from '@/entities/project';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
export function CreateProjectDialog({ workspaceId, open, onClose }: { workspaceId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(''); const [key, setKey] = useState(''); const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient(); const navigate = useNavigate();
  function reset() { setName(''); setKey(''); setDescription(''); setError(''); onClose(); }
  function close() { if (!busy) reset(); }
  async function save() {
    if (busy) return; setBusy(true); setError(''); let id: string;
    try { id = await createProject(workspaceId, { name: name.trim(), key: key.trim(), description: description.trim() || null }); }
    catch (failure) { setError(authError(failure)); setBusy(false); return; }
    setBusy(false); reset(); await refreshProjects(client, workspaceId); void navigate({ href: `/w/${workspaceId}/p/${id}` });
  }
  return <CompactDialog isOpen={open} title="프로젝트 만들기" width={520} isBusy={busy} onClose={close} onSubmit={() => { void save(); }} footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={busy} /><Button type="submit" label="프로젝트 만들기" variant="primary" isLoading={busy} isDisabled={!name.trim() || !/^[A-Z0-9]{2,10}$/.test(key.trim())} /></>}>
    <TextInput placeholder="예: 제품 개발" label="프로젝트 이름" value={name} onChange={setName} isRequired isDisabled={busy} />
    <TextInput label="프로젝트 키" value={key} onChange={v => setKey(v.toUpperCase())} isRequired isDisabled={busy} placeholder="예: BIT" />
    <Text type="supporting" color="secondary">영문 대문자·숫자 2~10자. 작업 번호는 BIT-1처럼 표시됩니다. 키를 바꿔도 이전 키는 계속 인식됩니다.</Text>
    <TextArea placeholder="목적과 필요한 맥락을 적어 주세요" label="설명" value={description} onChange={setDescription} rows={3} maxLength={20000} isDisabled={busy} /><FormMessage message={error} />
  </CompactDialog>;
}
