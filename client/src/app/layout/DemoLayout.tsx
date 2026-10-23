import { useState, type MouseEvent } from 'react';
import { SideNav, SideNavItem, SideNavSection, Text } from '@astryxdesign/core';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ShellFrame, ShellTabBar, Trail, type ShellTab, type TrailStep } from '@/widgets/app-shell';
import { PRODUCT_NAME } from '@/shared/config';
import { DefaultAvatar, NavIcon } from '@/shared/ui';
import { WorkspaceSwitcher } from '@/features/demo-workspace-switcher';
import {
  demoPlace, NOTICES, PATTERN_MENU, placeNames, PROJECT_MENU, PROJECT_TABS, projectPath, projectsIn, workspaceOf, workspacePath, WORKSPACE_MENU, WORKSPACE_TABS,
} from '@/entities/demo-sample';
import styles from './demo-layout.module.css';

/**
 * The demo's frame: the same ShellFrame the workspace draws, with the real app's menus at the real addresses under /demo
 * (the workspace switcher at its head, the workspace's menu and settings, its projects with the open one's own menu), then
 * the pattern pages. It
 * reads nothing from the server, so it opens without signing in; the account box is a stand-in.
 */
export function DemoLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const navigate = useNavigate();
  const [folded, setFolded] = useState(false);
  const place = demoPlace(pathname);
  const names = placeNames(place);
  const workspaceId = place.workspaceId ?? '';
  const workspace = workspaceOf(place.workspaceId);
  const projects = projectsIn(place.workspaceId).filter(project => project.status === 'active');
  const go = (href: string) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); void navigate({ href });
  };
  const hasNews = NOTICES.some(notice => !notice.isRead);

  // The trail: the workspace (to its home), the project (to its work), the menu entry, then the item in view.
  const steps: TrailStep[] = [];
  if (place.isWorkspaces) steps.push({ label: PRODUCT_NAME, href: '/demo', onClick: go('/demo') }, { label: '워크스페이스' });
  else if (place.pattern) steps.push({ label: 'UI 패턴' }, { label: PATTERN_MENU.find(entry => entry.path === place.pattern)?.label ?? '패턴' });
  else if (workspace) {
    const home = workspacePath(workspaceId);
    steps.push({ label: workspace.name, href: home, onClick: go(home) });
    if (place.projectId) {
      const work = projectPath(workspaceId, place.projectId);
      if (names.item) steps.push({ label: names.project ?? '프로젝트', href: work, onClick: go(work) }, { label: names.item });
      else steps.push({ label: names.project ?? '프로젝트', href: work, onClick: go(work) }, { label: names.section ?? '페이지 찾기' });
    } else if (place.workspaceSection !== '') steps.push({ label: names.section ?? '페이지 찾기' });
    else steps.push({ label: '홈' });
  } else steps.push({ label: PRODUCT_NAME }, { label: '페이지 찾기' });

  const item = (label: string, icon: string, href: string, isSelected: boolean, extra?: object) =>
    <SideNavItem key={href} label={label} href={href} icon={<NavIcon name={icon} />} isSelected={isSelected} onClick={go(href)} {...extra} />;
  const sidebar = <SideNav aria-label="데모 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }}
    resizable={{ defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-demo-sidebar', isCollapsed: folded, onCollapseChange: setFolded }}
    header={<header className={styles.heading} data-folded={folded || undefined}><WorkspaceSwitcher current={workspace} isFolded={folded} /></header>}
    topContent={folded ? <div className={styles.accountFolded}><DefaultAvatar seed="u1" name="고재범" /></div>
      : <div className={styles.account}><DefaultAvatar seed="u1" name="고재범" /><span className={styles.accountText}><Text weight="semibold" maxLines={1}>고재범</Text><Text type="supporting" color="secondary" maxLines={1}>데모 · 목데이터</Text></span></div>}
    footer={!folded && <Text type="supporting" color="secondary">v0.0.0 · demo</Text>}>
    <SideNavSection title="워크스페이스" isHeaderHidden>
      {workspace && WORKSPACE_MENU.map(entry => item(entry.label, entry.icon, workspacePath(workspaceId, entry.path), !place.projectId && place.workspaceSection === entry.path,
        entry.path === '/inbox' && hasNews ? { endContent: <span className={styles.newsDot} role="img" aria-label="확인할 것 있음" /> } : undefined))}
      {workspace && item('워크스페이스 설정', 'settings', workspacePath(workspaceId, '/settings'), place.workspaceSection === '/settings')}
    </SideNavSection>
    {workspace && !folded && <SideNavSection title="프로젝트">
      {item('모든 프로젝트', 'grid', workspacePath(workspaceId, '/projects'), place.workspaceSection === '/projects')}
      {projects.map(project => {
        const isOpen = place.projectId === project.id;
        const base = projectPath(workspaceId, project.id);
        return <SideNavItem key={project.id} label={project.name} href={base} icon={<span className={styles.projectMark} aria-hidden="true">{project.key.slice(0, 1)}</span>}
          isSelected={false} onClick={go(base)}>
          {isOpen && PROJECT_MENU.map(entry => <SideNavItem key={entry.path} label={entry.label} href={base + entry.path}
            isSelected={place.projectSection === entry.path} onClick={go(base + entry.path)} />)}
        </SideNavItem>;
      })}
    </SideNavSection>}
    <SideNavSection title="UI 패턴">
      {PATTERN_MENU.map(entry => item(entry.label, entry.icon, entry.path, place.pattern === entry.path))}
    </SideNavSection>
  </SideNav>;

  // A phone's tab bar: the scope's first menus as tabs (D-034), everything else in 더보기.
  const tab = (label: string, icon: string, href: string, isCurrent: boolean): ShellTab => ({ label, icon, href, isCurrent });
  const inProject = !!place.projectId;
  const scopeTabs = inProject
    ? PROJECT_MENU.map(entry => tab(entry.label, entry.icon, projectPath(workspaceId, place.projectId!, entry.path), place.projectSection === entry.path))
    : WORKSPACE_MENU.map(entry => tab(entry.label, entry.icon, workspacePath(workspaceId, entry.path), place.workspaceSection === entry.path));
  const count = inProject ? PROJECT_TABS : WORKSPACE_TABS;
  const more = [
    ...scopeTabs.slice(count),
    ...(inProject ? [tab('워크스페이스 홈', 'home', workspacePath(workspaceId), false)] : []),
    tab('모든 프로젝트', 'grid', workspacePath(workspaceId, '/projects'), place.workspaceSection === '/projects'),
    ...(inProject ? [] : [tab('워크스페이스 설정', 'settings', workspacePath(workspaceId, '/settings'), place.workspaceSection === '/settings')]),
    tab('공간 선택 · 전환', 'switcher', '/demo/workspaces', !!place.isWorkspaces),
    ...PATTERN_MENU.map(entry => tab(entry.label, entry.icon, entry.path, place.pattern === entry.path)),
  ];
  return <ShellFrame pathname={pathname} folded={folded} onFold={setFolded} trail={<Trail steps={steps} />} sidebar={sidebar}
    mobileNav={workspace ? <ShellTabBar label={inProject ? '프로젝트 메뉴' : '워크스페이스 메뉴'} moreTitle={`${workspace.name}${inProject ? ` · ${names.project}` : ''}`} tabs={scopeTabs.slice(0, count)} more={more} /> : undefined}>
    <Outlet />
  </ShellFrame>;
}
