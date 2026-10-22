import { useState } from 'react';
import { Button, HStack, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { createWorkspace, selectWorkspace, workspacesQuery } from '@/entities/workspace';
import { authError } from '@/shared/api';
import { FormMessage, PageFrame, SectionHeader } from '@/shared/ui';
export function WorkspacesPage() {
  const { cursor } = useSearch({ from: '/workspace/workspaces' });
  const spaces = useQuery(workspacesQuery(cursor)); const client = useQueryClient(); const navigate = useNavigate();
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function open(id: string) {
    try { await selectWorkspace(id); } catch { /* The URL remains authoritative if selection fails. */ }
    await client.invalidateQueries({ queryKey: ['session'] });
    await navigate({ to: '/w/$workspaceId', params: { workspaceId: id } });
  }
  return <PageFrame title="워크스페이스"><VStack gap={6}>
    <Text color="secondary">함께 일할 공간을 선택하세요. 공간마다 멤버와 권한이 구분됩니다.</Text>
    {spaces.isError && <><FormMessage message={authError(spaces.error)} /><Button label="다시 불러오기" onClick={() => { void spaces.refetch(); }} /></>}
    {spaces.data?.items.length === 0 && <Text>아직 참여한 공간이 없습니다. 새 공간을 만들거나 초대 링크로 참여하세요.</Text>}
    <VStack gap={3}>{spaces.data?.items.map(space => <HStack key={space.id} gap={3} wrap="wrap"><Button label={space.name} onClick={() => { void open(space.id); }} /><Text type="supporting">{space.slug} · {space.myRole}</Text></HStack>)}</VStack>
    <HStack gap={4}>{cursor && <Link to="/workspaces" search={{}}>처음으로</Link>}{spaces.data?.nextCursor && <Link to="/workspaces" search={{ cursor: spaces.data.nextCursor }}>다음 페이지</Link>}</HStack>
    <SectionHeader title="새 워크스페이스" />
    <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError('');
      let id: string;
      try { id = await createWorkspace(name, slug); } catch (failure) { setError(authError(failure)); setBusy(false); return; }
      setName(''); setSlug(''); await client.invalidateQueries({ queryKey: ['workspaces'] }); await open(id); setBusy(false);
    }}><VStack gap={4}>
      <TextInput label="이름" placeholder="예: 제품 개발팀" value={name} onChange={setName} isRequired isDisabled={busy} />
      <TextInput label="고정 주소 (slug)" placeholder="예: product-team" value={slug} onChange={setSlug} isRequired isDisabled={busy} />
      <Text type="supporting">영문·숫자·하이픈 2~64자. 만든 뒤 바꾸거나 삭제 후 재사용할 수 없습니다.</Text>
      <FormMessage message={error} /><section data-action-row><Button type="submit" label="워크스페이스 만들기" variant="primary" isLoading={busy} /></section>
    </VStack></form>
  </VStack></PageFrame>;
}
