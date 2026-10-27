import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '@astryxdesign/core';
import { authError } from '@/shared/api';
import { NavIcon, PropertyPicker } from '@/shared/ui';
import { projectsQuery, ProjectMark } from '@/entities/project';
import { itemQuery, setItemProject, workItemHref, type WorkItem } from '@/entities/work-item';

export function WorkItemProject({ item, canWrite }: { item: WorkItem; canWrite: boolean }) {
  const result = useInfiniteQuery(projectsQuery(item.workspaceId));
  const client = useQueryClient(); const navigate = useNavigate(); const toast = useToast(); const [busy, setBusy] = useState(false);
  useEffect(() => { if (result.hasNextPage && !result.isFetchingNextPage && !result.isFetchNextPageError) void result.fetchNextPage(); }, [result]);
  const projects = result.data?.pages.flatMap(page => page.items) ?? [];
  const current = projects.find(project => project.id === item.projectId);
  const select = async (projectId: string | null) => {
    if (busy || projectId === item.projectId) return;
    setBusy(true);
    try {
      const latest = await client.fetchQuery({ ...itemQuery(item.workspaceId, item.projectId ?? '', item.id), staleTime: 0 });
      await setItemProject(item.workspaceId, item.id, projectId, latest.version);
      await client.invalidateQueries({ queryKey: itemQuery(item.workspaceId, projectId ?? '', item.id).queryKey });
      await navigate({ href: workItemHref(item.workspaceId, { id: item.id, projectId }), replace: true });
      await client.invalidateQueries({ queryKey: ['workspace', item.workspaceId] });
    } catch (failure) { toast({ body: authError(failure) }); }
    finally { setBusy(false); }
  };
  if (result.isError || result.isFetchNextPageError) return <button type="button" onClick={() => { void result.refetch(); }}><NavIcon name="folder" />프로젝트 다시 불러오기</button>;
  if (!canWrite || busy) return <span title={busy ? '프로젝트 변경 중' : '프로젝트'}>{current ? <ProjectMark project={current} /> : <NavIcon name="folder" />}{current?.name ?? '프로젝트 없음'}</span>;
  return <PropertyPicker label="프로젝트" icon="folder" value={item.projectId ?? 'none'} options={[
    { value: 'none', label: '프로젝트 없음', icon: <NavIcon name="folder" /> },
    ...projects.map(project => ({ value: project.id, label: project.name, icon: <ProjectMark project={project} /> })),
  ]} onChange={value => { void select(!value || value === 'none' ? null : String(value)); }} />;
}
