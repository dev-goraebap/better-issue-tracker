import type { MouseEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { emptyTaskSearch } from '@/features/work-item-filters';
import { projectQuery } from '@/entities/project';
import { itemQuery } from '@/entities/work-item';
import type { Space } from '@/entities/workspace';
import { PRODUCT_NAME, WORKSPACE_NAVIGATION } from '@/shared/config';
import { useSidebarFold } from '../model/use-sidebar-fold';
import { MobileNavigation } from './MobileNavigation';
import { ProjectMobileNavigation } from './ProjectMobileNavigation';
import { ShellFrame } from './ShellFrame';
import { Trail, type TrailStep } from './Trail';
import { WorkspaceSidebar } from './WorkspaceSidebar';

const PAGE_TITLES: Record<string, string> = { '/projects': '프로젝트', '/workspaces': '워크스페이스', '/settings/security': '비밀번호 변경', '/settings/api-keys': 'API 키', '/settings/appearance': '화면', '/settings': '워크스페이스 설정' };

export function WorkspaceShell({ pathname, children, workspace }: { pathname: string; children: ReactNode; workspace?: Space }) {
  const [folded, setFolded] = useSidebarFold();
  const navigate = useNavigate(); const router = useRouter();
  const suffix = workspace ? pathname.slice(`/w/${workspace.id}`.length) || '/' : pathname;
  const parts = /^\/p\/([^/]+)(?:\/work-items\/([^/]+))?/.exec(suffix); const projectId = parts?.[1] ?? ''; const workItemId = parts?.[2] ?? '';
  const project = useQuery({ ...projectQuery(workspace?.id ?? '', projectId), enabled: !!workspace && !!projectId });
  const item = useQuery({ ...itemQuery(workspace?.id ?? '', projectId, workItemId), enabled: !!workspace && !!projectId && !!workItemId });
  const title = projectId ? (suffix.endsWith('/settings') ? '프로젝트 설정' : workItemId ? item.data?.key ?? '작업 상세' : project.data?.name ?? '프로젝트') : WORKSPACE_NAVIGATION.find(entry => entry.path === suffix)?.label ?? PAGE_TITLES[suffix] ?? '업무 공간';
  const go = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); void navigate({ href });
  };
  const steps: TrailStep[] = workspace ? [{ label: workspace.name, href: `/w/${workspace.id}`, onClick: go(`/w/${workspace.id}`) }] : [{ label: PRODUCT_NAME, href: '/workspaces', onClick: go('/workspaces') }];
  if (workspace && projectId && (workItemId || suffix.endsWith('/settings'))) {
    const href = router.buildLocation({ to: '/w/$workspaceId/p/$projectId', params: { workspaceId: workspace.id, projectId }, search: { ...emptyTaskSearch(), view: 'board' } }).href;
    steps.push({ label: project.data?.name ?? '프로젝트', href, onClick: go(href) });
  }
  steps.push({ label: title });
  return <ShellFrame pathname={pathname} folded={folded} onFold={setFolded} trail={<Trail steps={steps} />}
    sidebar={<WorkspaceSidebar pathname={pathname} workspace={workspace} folded={folded} onFold={setFolded} />}
    mobileNav={workspace && projectId ? <ProjectMobileNavigation pathname={pathname} workspace={workspace} projectId={projectId} /> : <MobileNavigation pathname={pathname} workspace={workspace} />}>
    {children}
  </ShellFrame>;
}
