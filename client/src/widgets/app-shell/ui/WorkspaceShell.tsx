import { emptyTaskSearch } from '@/features/work-item-filters';
import { useState, type ReactNode } from 'react';
import { AppShell, HStack, IconButton, Text, VStack } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQuery } from '@tanstack/react-query';
import { projectQuery } from '@/entities/project';
import { itemQuery } from '@/entities/work-item';
import { ProjectMobileNavigation } from './ProjectMobileNavigation';
import { Link } from '@tanstack/react-router';
import { MOBILE_QUERY, PRODUCT_NAME, WORKSPACE_NAVIGATION } from '@/shared/config';
import { useAppearance } from '@/shared/lib/appearance';
import { NavIcon } from '@/shared/ui';
import { useSidebarFold } from '../model/use-sidebar-fold';
import { PageChromeContext } from '@/shared/ui/page-chrome';
import type { Space } from '@/entities/workspace';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { MobileNavigation } from './MobileNavigation';
import { AgentBar } from './AgentBar';
import styles from './app-shell.module.css';
export function WorkspaceShell({ pathname, children, workspace }: { pathname: string; children: ReactNode; workspace?: Space }) {
  const [folded, setFolded] = useSidebarFold();
  const isMobile = useMediaQuery(MOBILE_QUERY); const { layout } = useAppearance();
  const [actions, setActions] = useState<HTMLElement | null>(null); const [tools, setTools] = useState<HTMLElement | null>(null); const [rows, setRows] = useState<HTMLElement | null>(null);
  const suffix = workspace ? pathname.slice(`/w/${workspace.id}`.length) || '/' : pathname;
  const parts = /^\/p\/([^/]+)(?:\/work-items\/([^/]+))?/.exec(suffix); const projectId = parts?.[1] ?? ''; const workItemId = parts?.[2] ?? '';
  const project = useQuery({ ...projectQuery(workspace?.id ?? '', projectId), enabled: !!workspace && !!projectId });
  const item = useQuery({ ...itemQuery(workspace?.id ?? '', projectId, workItemId), enabled: !!workspace && !!projectId && !!workItemId });
  const title = projectId ? (suffix.endsWith('/settings') ? '프로젝트 설정' : workItemId ? item.data?.key ?? '작업 상세' : project.data?.name ?? '프로젝트') : WORKSPACE_NAVIGATION.find(item => item.path === suffix)?.label ?? ({ '/projects': '프로젝트', '/workspaces': '워크스페이스', '/settings/security': '비밀번호 변경', '/settings/api-keys': 'API 키', '/settings/appearance': '화면', '/settings': '워크스페이스 설정' }[suffix] ?? '업무 공간');
  return <AppShell height="fill" variant="wash" contentPadding={0}>
    <section className={styles.shell} data-layout={layout} aria-label={PRODUCT_NAME}>
      {!isMobile && <WorkspaceSidebar pathname={pathname} workspace={workspace} folded={folded} onFold={setFolded} />}
      <VStack gap={0} className={styles.frame}>
        <section className={styles.card} id="workspace-scroll" data-scroll-restoration-id="workspace-scroll">
          <header className={styles.chrome}>
            <HStack gap={2} className={styles.topbar} wrap="wrap" data-action-row>
              {!isMobile && <IconButton label={folded ? '사이드바 펼치기' : '사이드바 접기'} tooltip={folded ? '사이드바 펼치기' : '사이드바 접기'} aria-expanded={!folded} variant="ghost" size="sm" icon={<NavIcon name="sidebar" />} onClick={() => setFolded(!folded)} />}
              <nav aria-label="현재 위치" className={styles.breadcrumb}>
                {workspace ? <><Link to="/w/$workspaceId" params={{ workspaceId: workspace.id }}>{workspace.name}</Link><Text type="supporting" aria-hidden="true">›</Text></> : <Link to="/workspaces">{PRODUCT_NAME}</Link>}
                {workspace && projectId && (workItemId || suffix.endsWith('/settings')) && <><Link to="/w/$workspaceId/p/$projectId" params={{ workspaceId: workspace.id, projectId }} search={{ ...emptyTaskSearch(), view: 'board' }}>{project.data?.name ?? '프로젝트'}</Link><Text type="supporting" aria-hidden="true">›</Text></>}
                <Text type="supporting" weight="medium" aria-current="page">{title}</Text>
              </nav>
              <HStack gap={2} className={styles.headerEnd}><section ref={setTools} className={styles.slot} /><section ref={setActions} className={styles.slot} /></HStack>
            </HStack>
            <section ref={setRows} />
          </header>
          <PageChromeContext.Provider value={{ actions, tools, rows }}><section className={styles.content} key={pathname}>{children}</section></PageChromeContext.Provider>
        </section>
        {!isMobile && <AgentBar />}
        {isMobile && (workspace && projectId ? <ProjectMobileNavigation pathname={pathname} workspace={workspace} projectId={projectId} /> : <MobileNavigation pathname={pathname} workspace={workspace} />)}
      </VStack>
    </section>
  </AppShell>;
}
