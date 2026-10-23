import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { PageFrame } from '@/shared/ui';
import { DemoWorkList } from '@/widgets/demo-work-list';
import { ME, projectsIn, WORK_ITEMS, type TableSearch } from '@/entities/demo-sample';

/**
 * PATTERN · 표 목록, /demo/w/$workspaceId/my-tasks. The member's own work items across the workspace's projects, drawn by
 * the shared work list (DemoWorkList): no 담당자 filter, as the list is already the member's, and no create action, as
 * a work item is made inside its project.
 */
export function DemoMyTasksPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/my-tasks' });
  const search = useSearch({ from: '/demo/w/$workspaceId/my-tasks' });
  const navigate = useNavigate();
  const items = useMemo(() => {
    const projects = projectsIn(workspaceId).map(project => project.id);
    return WORK_ITEMS.filter(item => item.assigneeId === ME && projects.includes(item.projectId));
  }, [workspaceId]);
  const go = useCallback((patch: Partial<TableSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/my-tasks', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  return <PageFrame title="My Tasks" icon="tasks" chrome="header">
    <DemoWorkList workspaceId={workspaceId} items={items} search={search} onChange={go} isAssigneeFixed />
  </PageFrame>;
}
