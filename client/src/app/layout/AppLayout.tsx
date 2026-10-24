import { useEffect, useState, type MouseEvent } from 'react';
import { Button, IconButton, SideNav, SideNavItem, SideNavSection, Text } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { ShellFrame, ShellTabBar, Trail, useSidebarFold, type ShellTab, type TrailStep } from '@/widgets/app-shell';
import {
  ACCOUNT_MENU, appPlace, PRODUCT_NAME, PROJECT_SETTINGS_MENU, projectPath, projectSettingsPath, WORKSPACE_MENU, WORKSPACE_SETTINGS_MENU, workspacePath,
  workspaceSettingsPath,
} from '@/shared/config';
import { ApiError, logout, sessionQueryOptions } from '@/shared/api';
import { isJustBefore } from '@/shared/lib/history-trail';
import { DefaultAvatar, NavIcon, NotificationBell } from '@/shared/ui';
import { WorkspaceSwitcher } from '@/features/workspace-switcher';
import { CreateProjectDialog } from '@/features/project-create';
import { workspaceQuery } from '@/entities/workspace';
import { projectsQuery } from '@/entities/project';
import { itemQuery } from '@/entities/work-item';
import { ScopeSwitcher } from './ScopeSwitcher';
import styles from './app-layout.module.css';

const SECTION_NAMES: Record<string, string> = { '/inbox': '알림', '/projects': '모든 프로젝트', '/issues/new': '새 이슈' };

/**
 * The signed-in app's frame (D-058's demo, made real): ShellFrame with the workspace switcher and the bell at the menu's
 * head; 홈, 문서함 and 구성원 (D-071); 프로젝트 with its + and the active projects, each one page of issues (D-066); and
 * 워크스페이스 설정 and the member's card at its foot. On the home (전체) and a project's page the trail's second step
 * switches between them (D-065). The card's gear turns the menu into the member's own settings (/settings/…), and
 * 워크스페이스 설정 into the workspace's (its pages, then each project's, D-061): either way 돌아가기 or Esc goes back
 * to the page of work left. A workspace the member lost (404) sends them to choose another.
 */

/** The last page of work in view, where the settings' 돌아가기 returns, and the last workspace, whose settings show. */
let lastWork = '';
let lastSpace = '';
export function AppLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const searchStr = useRouterState({ select: state => (state.resolvedLocation ?? state.location).searchStr });
  const navigate = useNavigate();
  const router = useRouter();
  const client = useQueryClient();
  const [folded, setFolded] = useSidebarFold();
  const place = appPlace(pathname);
  const isAccount = !!place.account;
  const isSpaceSettings = !!place.settings;
  const isSettings = isAccount || isSpaceSettings;
  if (place.workspaceId) lastSpace = place.workspaceId;
  const workspaceId = place.workspaceId ?? (isAccount ? lastSpace : '');
  const me = useQuery(sessionQueryOptions).data?.user;
  const space = useQuery({ ...workspaceQuery(workspaceId), enabled: !!workspaceId });
  const workspace = workspaceId ? space.data : undefined;
  const projectPages = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !!workspace });
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  const item = useQuery({ ...itemQuery(workspaceId, place.projectId ?? '', place.itemId ?? ''), enabled: !!workspace && !!place.projectId && !!place.itemId && place.itemId !== 'new' });
  const [isCreatingProject, setCreatingProject] = useState(false);

  // A workspace the member can no longer see: back to choosing one.
  useEffect(() => {
    if (!workspaceId || !(space.error instanceof ApiError) || space.error.status !== 404) return;
    void client.cancelQueries({ queryKey: ['workspace', workspaceId] }).then(async () => {
      await navigate({ to: '/workspaces', replace: true });
      client.removeQueries({ queryKey: ['workspace', workspaceId] });
      await client.invalidateQueries({ queryKey: ['workspaces'] });
    });
  }, [space.error, workspaceId, client, navigate]);
  useEffect(() => { if (!isSettings) lastWork = `${pathname}${searchStr}`; }, [isSettings, pathname, searchStr]);
  // 돌아가기: back through history when the page of work is just before, else to it (or the start).
  const leaveSettings = () => {
    if (lastWork && isJustBefore(lastWork)) router.history.back();
    else void navigate({ href: lastWork || '/' });
  };
  // Esc leaves the settings too, unless it is closing something or the member is typing.
  useEffect(() => {
    if (!isSettings) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return;
      leaveSettings();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const go = (href: string) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); void navigate({ href });
  };
  const signOut = async () => {
    await logout();
    await client.cancelQueries(); client.clear();
    await navigate({ to: '/login' });
  };

  // The notices' bell at the menu's head (a phone's header row). Notices are not made yet (T-006), so it is never lit.
  const inbox = workspacePath(workspaceId, '/inbox');
  const bell = workspace && <NotificationBell count={0} href={inbox} onOpen={go(inbox)} />;
  const projectMark = (key: string) => <span className={styles.projectMark} aria-hidden="true">{key.slice(0, 1)}</span>;
  const projectName = (id?: string) => projects.find(project => project.id === id)?.name;
  // The scope's step on the home and a project's pages: 전체 or the project, switching among them with the view kept.
  const scopeStep = (label: string): TrailStep => ({ label, content: <ScopeSwitcher projects={projects} current={place.projectId} mark={projectMark}
    onCreate={() => setCreatingProject(true)}
    onPick={projectId => {
      const keep = new URLSearchParams([...new URLSearchParams(searchStr)].filter(([key]) => key === 'v'));
      void navigate({ href: `${projectId ? projectPath(workspaceId, projectId) : workspacePath(workspaceId)}${keep.size ? `?${keep}` : ''}` });
    }} /> });
  // The trail: the workspace (to its home), the scope (전체 or the project, a switcher), then the item in view.
  const steps: TrailStep[] = [];
  if (isAccount) steps.push({ label: '계정' }, { label: ACCOUNT_MENU.find(entry => entry.path === place.account)?.label ?? '설정' });
  else if (isSpaceSettings && workspace) {
    const home = workspacePath(workspaceId);
    steps.push({ label: workspace.name, href: home, onClick: go(home) }, { label: '설정' });
    const entries = place.settingsProjectId ? PROJECT_SETTINGS_MENU : WORKSPACE_SETTINGS_MENU;
    if (place.settingsProjectId) steps.push({ label: projectName(place.settingsProjectId) ?? '프로젝트' });
    steps.push({ label: entries.find(entry => entry.path === place.settings)?.label ?? '페이지 찾기' });
  }
  else if (place.isWorkspaces) steps.push({ label: PRODUCT_NAME }, { label: '워크스페이스' });
  else if (workspace) {
    const home = workspacePath(workspaceId);
    steps.push({ label: workspace.name, href: home, onClick: go(home) });
    if (place.projectId) {
      steps.push(scopeStep(projectName(place.projectId) ?? '프로젝트'));
      const key = item.data?.key;
      if (place.itemId) steps.push({ label: place.itemId === 'new' ? '새 이슈' : key && place.isEditing ? `${key} 편집` : key ?? '이슈' });
    } else if (place.workspaceSection === '') steps.push(scopeStep('전체'));
    else steps.push({ label: WORKSPACE_MENU.find(entry => entry.path === place.workspaceSection)?.label ?? SECTION_NAMES[place.workspaceSection ?? ''] ?? '페이지 찾기' });
  } else steps.push({ label: PRODUCT_NAME });

  const entry = (label: string, icon: string, href: string, isSelected: boolean) =>
    <SideNavItem key={href} label={label} href={href} icon={<NavIcon name={icon} />} isSelected={isSelected} onClick={go(href)} />;
  const openSettings = () => void navigate({ href: ACCOUNT_MENU[0]!.path });
  const resizable = { defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-sidebar', isCollapsed: folded, onCollapseChange: setFolded };
  const version = !folded && <Text type="supporting" color="secondary" className={styles.version}>v0.0.0</Text>;
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
    ? <SideNav aria-label="설정 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable} header={backHead}
      footer={<div className={styles.foot}>{!folded && <Button label="로그아웃" variant="ghost" size="sm" icon={<NavIcon name="logout" />} onClick={() => { void signOut(); }} />}{version}</div>}>
      <SideNavSection title="계정">
        {ACCOUNT_MENU.map(each => entry(each.label, each.icon, each.path, place.account === each.path))}
      </SideNavSection>
    </SideNav>
    : isSpaceSettings
    // The workspace's settings: 돌아가기 (or Esc), then the workspace's pages under its name, each project folding open
    // to its own pages (the one in view open).
    ? <SideNav aria-label="워크스페이스 설정 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable} header={backHead} footer={version}>
      <SideNavSection title={workspace?.name ?? '워크스페이스'}>
        {WORKSPACE_SETTINGS_MENU.map(each => entry(each.label, each.icon, workspaceSettingsPath(workspaceId, each.path), !place.settingsProjectId && place.settings === each.path))}
      </SideNavSection>
      {!folded && projects.length > 0 && <SideNavSection title="프로젝트">
        {projects.map(project => {
          const isOpen = place.settingsProjectId === project.id;
          return <SideNavItem key={`${project.id}${isOpen ? '-open' : ''}`} label={project.name} icon={projectMark(project.key)} collapsible={{ defaultIsCollapsed: !isOpen }}>
            {PROJECT_SETTINGS_MENU.map(each => {
              const href = projectSettingsPath(workspaceId, project.id, each.path);
              return <SideNavItem key={each.path} label={each.label} href={href} icon={<NavIcon name={each.icon} />} isSelected={isOpen && place.settings === each.path} onClick={go(href)} />;
            })}
          </SideNavItem>;
        })}
      </SideNavSection>}
    </SideNav>
    : <SideNav aria-label="워크스페이스 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable}
      header={<header className={styles.heading} data-folded={folded || undefined}>
        <WorkspaceSwitcher current={workspace} isFolded={folded} />{bell}
      </header>}
      footer={<div className={styles.foot}>{workspace && entry('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false)}{account}{version}</div>}>
      <SideNavSection title="워크스페이스">
        {workspace && WORKSPACE_MENU.map(each => entry(each.label, each.icon, workspacePath(workspaceId, each.path), !place.projectId && place.workspaceSection === each.path))}
      </SideNavSection>
      {workspace && <SideNavSection title="프로젝트" endContent={folded ? undefined : <IconButton label="프로젝트 만들기" tooltip="프로젝트 만들기" variant="ghost" size="sm"
        icon={<NavIcon name="plus" />} onClick={() => setCreatingProject(true)} />}>
        {projects.map(project => {
          const href = projectPath(workspaceId, project.id);
          return <SideNavItem key={project.id} label={project.name} href={href} icon={projectMark(project.key)} isSelected={place.projectId === project.id} onClick={go(href)} />;
        })}
      </SideNavSection>}
    </SideNav>;

  // A phone's tab bar: the scope's first menus as tabs, everything else in 더보기 (the settings' too, with 돌아가기).
  const tab = (label: string, icon: string, href: string, isCurrent: boolean): ShellTab => ({ label, icon, href, isCurrent });
  const spaceSettingsTabs = place.settingsProjectId
    ? PROJECT_SETTINGS_MENU.map(each => tab(each.label, each.icon, projectSettingsPath(workspaceId, place.settingsProjectId!, each.path), place.settings === each.path))
    : WORKSPACE_SETTINGS_MENU.map(each => tab(each.label, each.icon, workspaceSettingsPath(workspaceId, each.path), place.settings === each.path));
  const scopeTabs = isAccount
    ? ACCOUNT_MENU.map(each => tab(each.label, each.icon, each.path, place.account === each.path))
    : isSpaceSettings ? spaceSettingsTabs
    : WORKSPACE_MENU.map(each => tab(each.label, each.icon, workspacePath(workspaceId, each.path), !place.projectId && place.workspaceSection === each.path));
  const count = 3;
  const back = tab('돌아가기', 'previous', lastWork || '/', false);
  const more = isAccount ? [...scopeTabs.slice(count), back] : isSpaceSettings ? [
    ...scopeTabs.slice(count),
    ...(place.settingsProjectId ? [tab('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false)] : []),
    ...projects.filter(project => project.id !== place.settingsProjectId).map(project => tab(`${project.name} 설정`, 'board', projectSettingsPath(workspaceId, project.id), false)),
    back,
  ] : [
    ...scopeTabs.slice(count),
    ...projects.map(project => tab(project.name, 'board', projectPath(workspaceId, project.id), place.projectId === project.id)),
    tab('모든 프로젝트', 'grid', workspacePath(workspaceId, '/projects'), place.workspaceSection === '/projects'),
    tab('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false),
    tab('공간 선택 · 전환', 'switcher', '/workspaces', !!place.isWorkspaces),
    tab('내 설정', 'settings', ACCOUNT_MENU[0]!.path, false),
  ];
  // A phone's 더보기 sheet ends with the member: their picture and name, their own settings and 로그아웃 (bit-frontend 04 §2).
  const mobileAccount = <div className={styles.sheetAccount}>
    <div className={styles.account}><DefaultAvatar seed={me?.id ?? ''} name={name} />
      <span className={styles.accountText}><Text weight="semibold" maxLines={1}>{name}</Text><Text type="supporting" color="secondary" maxLines={1}>{me?.email}</Text></span>
    </div>
    <Button label="로그아웃" variant="secondary" icon={<NavIcon name="logout" />} onClick={() => { void signOut(); }} />
  </div>;
  return <ShellFrame pathname={pathname} folded={folded} onFold={setFolded} trail={<Trail steps={steps} />} sidebar={sidebar} mobileEnd={bell}
    mobileNav={isSettings ? <ShellTabBar label="설정 메뉴" moreTitle={isAccount ? '계정' : `${workspace?.name ?? ''} 설정`} tabs={scopeTabs.slice(0, count)} more={more} account={mobileAccount} />
      : workspace ? <ShellTabBar label="워크스페이스 메뉴" moreTitle={workspace.name} tabs={scopeTabs.slice(0, count)} more={more} account={mobileAccount} /> : undefined}>
    <Outlet />
    {workspace && <CreateProjectDialog workspaceId={workspaceId} isOpen={isCreatingProject} onClose={() => setCreatingProject(false)}
      onCreated={id => { setCreatingProject(false); void navigate({ href: projectPath(workspaceId, id) }); }} />}
  </ShellFrame>;
}
