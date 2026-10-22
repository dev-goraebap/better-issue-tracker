import { useEffect } from 'react';
import { Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkspaceShell } from '@/widgets/app-shell';
import { workspaceQuery } from '@/entities/workspace';
import { ApiError } from '@/shared/api';
export function WorkspaceLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const { workspaceId } = useParams({ strict: false }); const client = useQueryClient(); const navigate = useNavigate();
  const result = useQuery({ ...workspaceQuery(workspaceId ?? ''), enabled: !!workspaceId });
  useEffect(() => {
    if (!workspaceId || !(result.error instanceof ApiError) || result.error.status !== 404) return;
    void client.cancelQueries({ queryKey: ['workspace', workspaceId] }).then(async () => { await navigate({ to: '/workspaces', replace: true }); client.removeQueries({ queryKey: ['workspace', workspaceId] }); await client.invalidateQueries({ queryKey: ['workspaces'] }); });
  }, [result.error, workspaceId, client, navigate]);
  return <WorkspaceShell pathname={pathname} workspace={workspaceId ? result.data : undefined}><Outlet /></WorkspaceShell>;
}
