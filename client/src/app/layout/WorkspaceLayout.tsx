import { Outlet, useRouterState } from '@tanstack/react-router';
import { WorkspaceShell } from '@/widgets/app-shell';
export function WorkspaceLayout() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  return <WorkspaceShell pathname={pathname}><Outlet /></WorkspaceShell>;
}
