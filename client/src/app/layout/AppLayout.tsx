import { useEffect, useEffectEvent, useState, type MouseEvent } from 'react';
import { Button, IconButton, SideNav, SideNavItem, SideNavSection, Text } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { ShellFrame, ShellTabBar, Trail, useSidebarFold, type ShellTab, type TrailStep } from '@/widgets/app-shell';
import {
  ACCOUNT_MENU, APP_VERSION, appPlace, PRODUCT_NAME, PROJECT_SETTINGS_MENU, projectPath, projectSettingsPath, WORKSPACE_MENU, WORKSPACE_SETTINGS_MENU, workspacePath,
  workspaceSettingsPath,
} from '@/shared/config';
import { ApiError, logout, sessionQueryOptions } from '@/shared/api';
import { isJustBefore, isPlainClick } from '@/shared/lib/history-trail';
import { isForOther } from '@/shared/lib/key-target';
import { rememberPictures } from '@/shared/lib/person-pictures';
import { DefaultAvatar, NavIcon, NotificationBell } from '@/shared/ui';
import { WorkspaceSwitcher } from '@/features/workspace-switcher';
import { forgetWorkspace, workspaceQuery } from '@/entities/workspace';
import { ProjectMark, projectQuery, projectsQuery, type Project } from '@/entities/project';
import { contentsQuery, documentQuery, documentIdOf, documentHref, folderHref } from '@/entities/document';
import { itemQuery } from '@/entities/work-item';
import { unreadCountQuery } from '@/entities/notification';
import { favoritesQuery, navigationQuery, scopeMenu } from '@/entities/navigation';
import { ProjectSwitcher } from './ProjectSwitcher';
import styles from './app-layout.module.css';

const SECTION_NAMES: Record<string, string> = { '/inbox': '알림', '/projects': '모든 프로젝트', '/work-items/new': '새 업무' };

/** Existing shell chrome with workspace/project scope navigation (D-116). */
export function AppLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const searchStr = useRouterState({ select: state => (state.resolvedLocation ?? state.location).searchStr });
  const navigate = useNavigate();
  const router = useRouter();
  const client = useQueryClient();
  const [folded, setFolded] = useSidebarFold();
  // The last page of work in view, where the settings' 돌아가기 returns, and the last workspace, whose menu the member's
  // own settings keep beside them.
  const [lastWork, setLastWork] = useState('');
  const [lastSpace, setLastSpace] = useState('');
  const place = appPlace(pathname);
  const isAccount = !!place.account;
  const isSpaceSettings = !!place.settings;
  const isSettings = isAccount || isSpaceSettings;
  const workspaceId = place.workspaceId ?? (isAccount ? lastSpace : '');
  const documentId = place.documentRef && place.documentRef !== 'new' ? documentIdOf(place.documentRef) : '';
  const document = useQuery({ ...documentQuery(workspaceId ?? '', documentId), enabled: !!workspaceId && !!documentId }).data;
  const documentSearch = new URLSearchParams(searchStr);
  const folderId = documentSearch.get('folder') ?? undefined;
  const documentProject = document?.projectId ?? place.projectId ?? documentSearch.get('project') ?? undefined;
  const focusedProject = place.projectId ?? place.settingsProjectId ?? (place.documentRef ? documentProject : undefined);
  const currentProject = useQuery({ ...projectQuery(workspaceId ?? '', focusedProject ?? ''), enabled: !!workspaceId && !!focusedProject }).data;
  const navigation = useQuery({ ...navigationQuery(workspaceId, focusedProject), enabled: !!workspaceId });
  const favorites = useQuery({ ...favoritesQuery(workspaceId), enabled: !!workspaceId }).data ?? [];
  const menus = scopeMenu(navigation.data?.entries, !!focusedProject);
  const scopeHref = (path: string) => focusedProject ? projectPath(workspaceId, focusedProject, path) : workspacePath(workspaceId, path);
  const documentFolder = useQuery({ ...contentsQuery(workspaceId ?? '', documentProject, folderId), enabled: !!workspaceId && !!folderId && (['/documents', '/resources'].includes(place.workspaceSection ?? '') || ['documents', 'resources'].includes(place.projectSection ?? '')) }).data;
  const me = useQuery(sessionQueryOptions).data?.user;
  // The member's own picture shows on their card and beside their name before any member list is read (BIT-30).
  useEffect(() => { if (me) rememberPictures([[me.id, me.avatar]]); }, [me]);
  const space = useQuery({ ...workspaceQuery(workspaceId), enabled: !!workspaceId });
  const workspace = workspaceId ? space.data : undefined;
  const projectPages = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !!workspace });
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  useEffect(() => { if (projectPages.hasNextPage && !projectPages.isFetchingNextPage && !projectPages.isFetchNextPageError) void projectPages.fetchNextPage(); }, [projectPages.hasNextPage, projectPages.isFetchingNextPage, projectPages.isFetchNextPageError, projectPages.fetchNextPage]);
  const item = useQuery({ ...itemQuery(workspaceId, place.projectId ?? '', place.itemId ?? ''), enabled: !!workspace && !!place.itemId && place.itemId !== 'new' });
  const activeSection = place.documentRef || place.projectSection === 'documents' || place.workspaceSection === '/documents' ? '/resources'
    : place.itemId ? item.data?.kind === 'event' || documentSearch.get('kind') === 'event' ? '/schedules' : '/issues'
    : focusedProject ? place.projectSection ? `/${place.projectSection}` : undefined : place.workspaceSection;

  const projectHref = (id: string) => place.settings && focusedProject
    ? projectSettingsPath(workspaceId, id, place.settings)
    : projectPath(workspaceId, id, activeSection ?? '/issues');
  const projectSwitcher = (onSelect?: (href: string) => void, isFolded = false) => <ProjectSwitcher key={`${workspaceId}.${focusedProject}`} workspaceId={workspaceId} workspaceName={workspace?.name}
    currentId={focusedProject ?? ''} current={currentProject} projects={projects} isFolded={isFolded} hrefFor={projectHref} onSelect={onSelect} />;

  // A workspace the member can no longer see: back to choosing one.
  useEffect(() => {
    if (!workspaceId || !(space.error instanceof ApiError) || space.error.status !== 404) return;
    void navigate({ to: '/workspaces', replace: true }).then(() => forgetWorkspace(client, workspaceId));
  }, [space.error, workspaceId, client, navigate]);
  useEffect(() => { if (!isSettings) setLastWork(`${pathname}${searchStr}`); }, [isSettings, pathname, searchStr]);
  useEffect(() => { if (place.workspaceId) setLastSpace(place.workspaceId); }, [place.workspaceId]);
  // 돌아가기: back through history when the page of work is just before, else to it (or the start).
  const leaveSettings = () => {
    if (lastWork && isJustBefore(lastWork)) router.history.back();
    else void navigate({ href: lastWork || '/' });
  };
  // Esc leaves the settings too, unless it is closing something or the member is typing.
  const onEscape = useEffectEvent((event: KeyboardEvent) => { if (event.key === 'Escape' && !isForOther(event)) leaveSettings(); });
  useEffect(() => {
    if (!isSettings) return undefined;
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isSettings]);
  const go = (href: string) => (event: MouseEvent) => {
    if (!isPlainClick(event)) return;
    event.preventDefault(); void navigate({ href });
  };
  const signOut = async () => {
    await logout();
    await client.cancelQueries(); client.clear();
    await navigate({ to: '/login' });
  };

  // The notices' bell at the menu's head (a phone's header row), lit while any are unread (BIT-39).
  const inbox = workspacePath(workspaceId, '/inbox');
  const unread = useQuery({ ...unreadCountQuery(workspaceId ?? ''), enabled: !!workspaceId }).data?.unread ?? 0;
  const bell = workspace && <NotificationBell count={unread} href={inbox} onOpen={go(inbox)} />;
  const projectMark = (project: Project) => <ProjectMark project={project} />;
  const projectName = (id?: string) => projects.find(project => project.id === id)?.name;
  // The scope's step on the home and a project's pages (D-088): 홈 or the project's name, a link to the scope's bare
  // address, which opens its default view (the first in its own order). Other projects are a step away in the menu.
  const scopeStep = (label: string, href: string): TrailStep => ({ label, href, onClick: go(href) });
  // The trail: the workspace (to its home), the scope (홈 or the project), then the item in view.
  const steps: TrailStep[] = [];
  if (isAccount) steps.push({ label: '계정' }, { label: ACCOUNT_MENU.find(entry => entry.path === place.account)?.label ?? '설정' });
  else if (isSpaceSettings && workspace) {
    const home = workspacePath(workspaceId, '/issues');
    steps.push({ label: workspace.name, href: home, onClick: go(home) }, scopeStep('설정', workspaceSettingsPath(workspaceId)));
    const entries = place.settingsProjectId ? PROJECT_SETTINGS_MENU : WORKSPACE_SETTINGS_MENU;
    if (place.settingsProjectId) steps.push(scopeStep(projectName(place.settingsProjectId) ?? '프로젝트', projectSettingsPath(workspaceId, place.settingsProjectId)));
    steps.push({ label: entries.find(entry => entry.path === place.settings)?.label ?? '페이지 찾기' });
  }
  else if (place.isWorkspaces) steps.push({ label: PRODUCT_NAME }, { label: '워크스페이스' });
  else if (workspace) {
    const home = workspacePath(workspaceId, '/issues');
    steps.push({ label: workspace.name, href: home, onClick: go(home) });
    if (place.projectId) {
      steps.push(scopeStep(projectName(place.projectId) ?? '프로젝트', projectPath(workspaceId, place.projectId)));
      if (place.projectSection) steps.push({ label: menus.find(entry => entry.path === `/${place.projectSection === 'documents' ? 'resources' : place.projectSection}`)?.label ?? '리소스' });

      const key = item.data?.key;
      if (place.itemId) {
        if (place.itemId === 'new') steps.push({ label: '새 업무' });
        else { steps.push(scopeStep(key ?? '업무', `${projectPath(workspaceId, place.projectId)}/work-items/${place.itemId}`)); if (place.isEditing) steps.push({ label: '편집' }); }
      }
    } else if (place.workspaceSection === '/members/invite') steps.push(scopeStep('구성원', workspacePath(workspaceId, '/members')), { label: '구성원 초대' });
    else if (place.workspaceSection === '' || place.workspaceSection === '/issues') steps.push(scopeStep('이슈', home));
    else steps.push({ label: menus.find(entry => entry.path === place.workspaceSection)?.label ?? SECTION_NAMES[place.workspaceSection ?? ''] ?? '페이지 찾기' });
  } else steps.push({ label: PRODUCT_NAME });
  if (workspace && (['/documents', '/resources'].includes(place.workspaceSection ?? '') || ['documents', 'resources'].includes(place.projectSection ?? ''))) {
    // A document route is workspace-scoped, but its trail retains its project and full folder path.
    steps.splice(1);
    if (documentProject) steps.push(scopeStep(projectName(documentProject) ?? '프로젝트', projectPath(workspaceId, documentProject)));
    steps.push(scopeStep('리소스', folderHref(workspaceId, documentProject ?? null)));
    for (const folder of document?.path ?? documentFolder?.path ?? []) steps.push(scopeStep(folder.name, folderHref(workspaceId, documentProject ?? null, folder.id)));
    if (place.documentRef) {
      if (document) steps.push(scopeStep(document.title, documentHref(workspaceId, document)));
      else steps.push({ label: place.documentRef === 'new' ? '새 문서' : '문서 상세' });
      if (place.isEditing) steps.push({ label: '편집' });
    }
  }

  const entry = (label: string, icon: string, href: string, isSelected: boolean) =>
    <SideNavItem key={href} label={label} href={href} icon={<NavIcon name={icon} size="navigation" />} isSelected={isSelected} onClick={go(href)} />;
  const openSettings = () => void navigate({ href: ACCOUNT_MENU[0]!.path });
  const resizable = { defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-sidebar', isCollapsed: folded, onCollapseChange: setFolded };
  const version = !folded && <Text type="supporting" color="secondary" className={styles.version}>v{APP_VERSION}</Text>;
  const backHead = <button type="button" className={styles.backHead} data-folded={folded || undefined} onClick={leaveSettings} aria-label="돌아가기 (Esc)">
    <NavIcon name="previous" />{!folded && <><span className={styles.backLabel}>돌아가기</span><kbd className={styles.kbd}>Esc</kbd></>}
  </button>;
  // The member's card at the menu's foot, under 워크스페이스 설정: their picture, name and the gear to their own settings.
  const name = me?.name ?? '';
  const account = folded
    ? <div className={styles.accountFolded}><button type="button" className={styles.avatarButton} aria-label={`${name} · 내 설정`} onClick={openSettings}><DefaultAvatar seed={me?.id ?? ''} name={name} /></button></div>
    : <div className={styles.account}><DefaultAvatar seed={me?.id ?? ''} name={name} />
      <span className={styles.accountText}><Text weight="semibold" maxLines={1}>{name}</Text><Text type="supporting" color="secondary" maxLines={1}>{me?.email}</Text></span>
      <IconButton label="내 설정" tooltip="내 설정" icon={<NavIcon name="settings" />} variant="ghost" size="sm" onClick={openSettings} />
    </div>;
  const sidebar = isAccount
    // The member's own settings: 돌아가기 (or Esc) at the head, then 계정 and its pages, 로그아웃 at the foot.
    ? <SideNav aria-label="설정 메뉴" className={`${styles.sidebar} ${folded ? styles.folded : ''}`} collapsible={{ hasButton: false }} resizable={resizable} header={backHead}
      footer={<div className={styles.foot}>{!folded && <Button label="로그아웃" variant="ghost" size="sm" icon={<NavIcon name="logout" />} onClick={() => { void signOut(); }} />}{version}</div>}>
      <SideNavSection title="계정">
        {ACCOUNT_MENU.map(each => entry(each.label, each.icon, each.path, place.account === each.path))}
      </SideNavSection>
    </SideNav>
    : <SideNav aria-label={focusedProject ? '프로젝트 메뉴' : '워크스페이스 메뉴'} className={`${styles.sidebar} ${folded ? styles.folded : ''}`} collapsible={{ hasButton: false }} resizable={resizable}
      header={<header className={styles.heading} data-folded={folded || undefined}>{focusedProject ? projectSwitcher(undefined, folded) : <WorkspaceSwitcher current={workspace} isFolded={folded} />}{bell}</header>}
      footer={<div className={styles.foot}>{account}{version}</div>}>
      <SideNavSection title={focusedProject ? '' : '워크스페이스'}>
        {workspace && menus.map(each => each.path === '/projects' ? <SideNavItem key="projects" label={each.label} href={scopeHref(each.path)} icon={<NavIcon name={each.icon} size="navigation" />} isSelected={place.workspaceSection === '/projects'} onClick={go(scopeHref(each.path))}>
          {favorites.length > 0 ? projects.filter(project => favorites.includes(project.id)).map(project => <SideNavItem key={project.id} label={project.name} href={projectPath(workspaceId, project.id, '/issues')} icon={projectMark(project)} onClick={go(projectPath(workspaceId, project.id, '/issues'))} />) : undefined}
        </SideNavItem> : entry(each.label, each.icon, scopeHref(each.path), activeSection === each.path))}
      </SideNavSection>
      {workspace && <SideNavSection title={focusedProject ? '프로젝트 관리' : '관리'}>
        {focusedProject ? PROJECT_SETTINGS_MENU.map(each => entry(each.label, each.icon, projectSettingsPath(workspaceId, focusedProject, each.path), place.settings === each.path)) : entry('워크스페이스 관리', 'settings', workspaceSettingsPath(workspaceId), isSpaceSettings)}
      </SideNavSection>}
    </SideNav>;

  // A phone's tab bar: the scope's first menus as tabs, everything else in 더보기 (the settings' too, with 돌아가기).
  const tab = (label: string, icon: string, href: string, isCurrent: boolean): ShellTab => ({ label, icon, href, isCurrent });
  const scopeTabs = isAccount ? ACCOUNT_MENU.map(each => tab(each.label, each.icon, each.path, place.account === each.path))
    : menus.map(each => tab(each.label, each.icon, scopeHref(each.path), activeSection === each.path));
  const count = 3;
  const more = [...scopeTabs.slice(count),
    ...(focusedProject ? [...PROJECT_SETTINGS_MENU.map(each => tab(each.label, each.icon, projectSettingsPath(workspaceId, focusedProject, each.path), place.settings === each.path))] : [tab('워크스페이스 관리', 'settings', workspaceSettingsPath(workspaceId), isSpaceSettings)]),
    tab('내 설정', 'settings', ACCOUNT_MENU[0]!.path, isAccount)];
  // A phone's 더보기 sheet ends with the member: their picture and name, their own settings and 로그아웃 (skill frontend/04-layout §2).
  const mobileAccount = <div className={styles.sheetAccount}>
    <div className={styles.account}><DefaultAvatar seed={me?.id ?? ''} name={name} />
      <span className={styles.accountText}><Text weight="semibold" maxLines={1}>{name}</Text><Text type="supporting" color="secondary" maxLines={1}>{me?.email}</Text></span>
    </div>
    <Button label="로그아웃" variant="secondary" icon={<NavIcon name="logout" />} onClick={() => { void signOut(); }} />
  </div>;
  return <ShellFrame folded={folded} onExpandSidebar={() => setFolded(false)} pathname={pathname} trail={<Trail steps={steps} />} sidebar={sidebar} mobileEnd={bell}
    mobileNav={isSettings ? <ShellTabBar label="설정 메뉴" moreTitle={isAccount ? '계정' : `${workspace?.name ?? ''} 설정`} tabs={scopeTabs.slice(0, count)} more={more} scopeSwitcher={focusedProject ? onSelect => projectSwitcher(onSelect) : undefined} account={mobileAccount} />
      : workspace ? <ShellTabBar label="워크스페이스 메뉴" moreTitle={workspace.name} tabs={scopeTabs.slice(0, count)} more={more} scopeSwitcher={focusedProject ? onSelect => projectSwitcher(onSelect) : undefined} account={mobileAccount} /> : undefined}>
    <Outlet />
  </ShellFrame>;
}
