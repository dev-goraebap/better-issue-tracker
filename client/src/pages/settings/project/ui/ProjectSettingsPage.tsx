import { useState } from 'react';
import { Button, Heading, HStack, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { projectQuery, projectPath, refreshProjects } from '@/entities/project';
import { workspaceQuery } from '@/entities/workspace';
import { authError, command } from '@/shared/api';
import { CompactDialog, FormMessage, PageFrame, QueryMessage, SectionHeader } from '@/shared/ui';
import { ProjectEditor } from './ProjectEditor';
import { ProjectColumns } from './ProjectColumns';
export function ProjectSettingsPage() {
  const { workspaceId = '', projectId = '' } = useParams({ strict: false }); const result = useQuery(projectQuery(workspaceId, projectId)); const space = useQuery(workspaceQuery(workspaceId)); const client = useQueryClient(); const navigate = useNavigate();
  const [editing, setEditing] = useState(false); const [removing, setRemoving] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const project = result.error ? undefined : result.data; const canManage = !space.error && (space.data?.myRole === 'owner' || space.data?.myRole === 'admin');
  return <PageFrame title="프로젝트 설정" width="narrow"><Link to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId }}>프로젝트로 돌아가기</Link><QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} /><FormMessage message={error} />
    {project && <><VStack gap={4}>{editing && canManage && !project.archivedAt ? <ProjectEditor project={project} onClose={() => setEditing(false)} /> : <><Heading level={2}>{project.name}</Heading><Text type="supporting">{project.key}{project.archivedAt ? ' · 보관됨' : ''}</Text><Text>{project.description || '설명이 없습니다.'}</Text>{canManage && !project.archivedAt && <Button label="프로젝트 정보 편집" onClick={() => setEditing(true)} />}</>}</VStack>
      <ProjectColumns project={project} canManage={canManage} />
      {canManage && <VStack gap={4}><SectionHeader title="보관과 삭제" /><Text type="supporting">보관하면 조회만 가능합니다. 삭제하면 작업을 포함한 프로젝트가 숨겨지며 프로젝트의 삭제 목록에서 복원할 수 있습니다.</Text><HStack gap={3} wrap="wrap" data-action-row>
        <Button label={project.archivedAt ? '프로젝트 보관 해제' : '프로젝트 보관'} isLoading={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await command('POST', `${projectPath(workspaceId, projectId)}/${project.archivedAt ? 'unarchive' : 'archive'}`, { expectedVersion: project.version }); } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshProjects(client, workspaceId); }} />
        <Button label="프로젝트 삭제" variant="ghost" onClick={() => setRemoving(true)} isDisabled={busy} />
      </HStack></VStack>}
    </>}
    <CompactDialog isOpen={removing} title="프로젝트를 삭제할까요?" onClose={() => setRemoving(false)} isBusy={busy} footer={<><Button label="취소" variant="ghost" onClick={() => setRemoving(false)} isDisabled={busy} /><Button label="프로젝트 삭제" variant="primary" isLoading={busy} onClick={async () => { if (busy || !project) return; setBusy(true); setError(''); try { await command('DELETE', `${projectPath(workspaceId, projectId)}?expectedVersion=${project.version}`); } catch (failure) { setError(authError(failure)); setBusy(false); return; } setBusy(false); setRemoving(false); await refreshProjects(client, workspaceId); void navigate({ to: '/w/$workspaceId/projects', params: { workspaceId }, search: { status: 'active', q: '' } }); }} /></>}><Text>이 프로젝트의 모든 업무 데이터가 숨겨집니다. 기존 작업 번호와 키 별칭은 유지됩니다.</Text><FormMessage message={error} /></CompactDialog>
  </PageFrame>;
}
