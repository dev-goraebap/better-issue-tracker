import { useEffect, useState, type MouseEvent } from 'react';
import { IconButton, SideNav, SideNavItem, SideNavSection, Text } from '@astryxdesign/core';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { ShellFrame, ShellTabBar, Trail, type ShellTab, type TrailStep } from '@/widgets/app-shell';
import { PRODUCT_NAME } from '@/shared/config';
import { isJustBefore } from '@/shared/lib/history-trail';
import { DefaultAvatar, NavIcon, NotificationBell } from '@/shared/ui';
import { WorkspaceSwitcher } from '@/features/demo-workspace-switcher';
import { IssueMenuButton } from '@/features/demo-issue-menu';
import {
  ACCOUNT_MENU, ADMIN_MENU, DEFAULT_WORKSPACE, demoPlace, ISSUE_MENU, issuePath, NOTICES, PATTERN_MENU, useReadNotices, placeNames, PROJECT_SETTINGS_MENU, projectSettingsPath,
  projectsIn, shownIssueMenu, useIssueMenu, workspaceOf, workspacePath, WORKSPACE_MENU, WORKSPACE_SETTINGS_MENU, workspaceSettingsPath,
} from '@/entities/demo-sample';
import styles from './demo-layout.module.css';

/**
 * The demo's frame: the same ShellFrame the workspace draws, with the real app's menus at the real addresses under /demo
 * (the workspace switcher and the bell at its head; 이슈 with the member's issue menus in their order and its control to
 * change that; 프로젝트, choosing the scope those menus show, D-063; the workspace's other pages; the pattern pages; and
 * 워크스페이스 설정 at its foot). The profile card's gear turns the menu into the member's own settings
 * (/demo/settings/…), and 워크스페이스 설정 into the workspace's (its pages, each project's, then the instance's, D-061):
 * either way 돌아가기 or Esc goes back to the page of work left. It reads nothing from the server, so it opens without
 * signing in; the account box is a stand-in.
 */

/** The last page of work in view, where the settings' 돌아가기 returns, and the last workspace, whose settings show. */
let lastWork = '';
let lastSpace = DEFAULT_WORKSPACE;
export function DemoLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const [folded, setFolded] = useState(false);
  const place = demoPlace(pathname);
  const isAccount = !!place.account;
  const isSpaceSettings = !!place.settings || !!place.admin;
  const isSettings = isAccount || isSpaceSettings;
  if (place.workspaceId) lastSpace = place.workspaceId;
  const searchStr = useRouterState({ select: state => (state.resolvedLocation ?? state.location).searchStr });
  useEffect(() => { if (!isSettings) lastWork = `${pathname}${searchStr}`; }, [isSettings, pathname, searchStr]);
  // 돌아가기: back through history when the page of work is just before, else to it (or the demo's start).
  const leaveSettings = () => {
    if (lastWork && isJustBefore(lastWork)) router.history.back();
    else void navigate({ href: lastWork || '/demo' });
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
  const names = placeNames(place);
  const workspaceId = place.workspaceId ?? (place.admin ? lastSpace : '');
  const workspace = workspaceOf(workspaceId || undefined);
  const projects = projectsIn(workspaceId || undefined).filter(project => project.status === 'active');
  // The issue menus as this member orders and shows them here, the one in view (a work item's page belongs to 작업), the
  // project chosen as their scope (a work item's own project on its page), and where choosing a project lands.
  const issueMenu = shownIssueMenu(useIssueMenu(workspaceId || DEFAULT_WORKSPACE));
  const issueEntry = place.projectId ? ISSUE_MENU[0] : ISSUE_MENU.find(entry => entry.path === place.workspaceSection);
  const scope = projects.find(project => project.id === (place.projectId ?? new URLSearchParams(searchStr).get('project')))?.id;
  const scopeBase = issueEntry?.path ?? issueMenu[0]!.path;
  const go = (href: string) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); void navigate({ href });
  };
  // The notices' bell at the menu's head (a phone's header row), lit while any are unread (D-059).
  const read = useReadNotices();
  const unread = NOTICES.filter(notice => !read.has(notice.id)).length;
  const inbox = workspacePath(workspaceId, '/inbox');
  const bell = workspace && <NotificationBell count={unread} href={inbox} onOpen={go(inbox)} />;

  // The trail: the workspace (to its home), the project (to its work), the menu entry, then the item in view.
  const steps: TrailStep[] = [];
  if (isAccount) steps.push({ label: '계정' }, { label: ACCOUNT_MENU.find(entry => entry.path === place.account)?.label ?? '설정' });
  else if (place.admin) steps.push({ label: '인스턴스 관리' }, { label: ADMIN_MENU.find(entry => entry.path === place.admin)?.label ?? '설정' });
  else if (isSpaceSettings && workspace) {
    const home = workspacePath(workspaceId);
    steps.push({ label: workspace.name, href: home, onClick: go(home) }, { label: '설정' });
    const entries = place.settingsProjectId ? PROJECT_SETTINGS_MENU : WORKSPACE_SETTINGS_MENU;
    if (names.settingsProject) steps.push({ label: names.settingsProject });
    steps.push({ label: entries.find(entry => entry.path === place.settings)?.label ?? '페이지 찾기' });
  }
  else if (place.isWorkspaces) steps.push({ label: PRODUCT_NAME, href: '/demo', onClick: go('/demo') }, { label: '워크스페이스' });
  else if (place.pattern) steps.push({ label: 'UI 패턴' }, { label: PATTERN_MENU.find(entry => entry.path === place.pattern)?.label ?? '패턴' });
  else if (workspace) {
    // The workspace (to its first issue menu), the project in scope, the menu, then the item in view.
    const home = issuePath(workspaceId, issueMenu[0]!.path);
    steps.push({ label: workspace.name, href: home, onClick: go(home) });
    if (issueEntry) {
      const scoped = projects.find(project => project.id === scope);
      if (scoped) { const href = issuePath(workspaceId, issueEntry.path, scoped.id); steps.push({ label: scoped.name, href, onClick: go(href) }); }
      if (names.item) { const href = issuePath(workspaceId, issueEntry.path, scope); steps.push({ label: issueEntry.label, href, onClick: go(href) }, { label: names.item }); }
      else steps.push({ label: issueEntry.label });
    } else steps.push({ label: names.section ?? '페이지 찾기' });
  } else steps.push({ label: PRODUCT_NAME }, { label: '페이지 찾기' });

  const item = (label: string, icon: string, href: string, isSelected: boolean, extra?: object) =>
    <SideNavItem key={href} label={label} href={href} icon={<NavIcon name={icon} />} isSelected={isSelected} onClick={go(href)} {...extra} />;
  const openSettings = () => void navigate({ to: '/demo/settings/profile' });
  const resizable = { defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-demo-sidebar', isCollapsed: folded, onCollapseChange: setFolded };
  // 워크스페이스 설정 sits at the menu's foot (with the version), under everything else.
  const version = !folded && <Text type="supporting" color="secondary" className={styles.version}>v0.0.0 · demo</Text>;
  const backHead = <button type="button" className={styles.backHead} data-folded={folded || undefined} onClick={leaveSettings} aria-label="돌아가기 (Esc)">
    <NavIcon name="previous" />{!folded && <><span className={styles.backLabel}>돌아가기</span><kbd className={styles.kbd}>Esc</kbd></>}
  </button>;
  const projectMark = (key: string) => <span className={styles.projectMark} aria-hidden="true">{key.slice(0, 1)}</span>;
  const sidebar = isAccount
    // The member's own settings: 돌아가기 (or Esc) at the head, then 계정 and its pages.
    ? <SideNav aria-label="설정 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable} header={backHead} footer={version}>
      <SideNavSection title="계정">
        {ACCOUNT_MENU.map(entry => item(entry.label, entry.icon, entry.path, place.account === entry.path))}
      </SideNavSection>
    </SideNav>
    : isSpaceSettings
    // The workspace's settings: 돌아가기 (or Esc), then the workspace's pages under its name, each project folding open
    // to its own pages (the one in view open), and the instance's for its administrators.
    ? <SideNav aria-label="워크스페이스 설정 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable} header={backHead} footer={version}>
      <SideNavSection title={workspace?.name ?? '워크스페이스'}>
        {WORKSPACE_SETTINGS_MENU.map(entry => item(entry.label, entry.icon, workspaceSettingsPath(workspaceId, entry.path), !place.settingsProjectId && place.settings === entry.path))}
      </SideNavSection>
      {!folded && projects.length > 0 && <SideNavSection title="프로젝트">
        {projects.map(project => {
          const isOpen = place.settingsProjectId === project.id;
          return <SideNavItem key={`${project.id}${isOpen ? '-open' : ''}`} label={project.name} icon={projectMark(project.key)} collapsible={{ defaultIsCollapsed: !isOpen }}>
            {PROJECT_SETTINGS_MENU.map(entry => {
              const href = projectSettingsPath(workspaceId, project.id, entry.path);
              return <SideNavItem key={entry.path} label={entry.label} href={href} icon={<NavIcon name={entry.icon} />} isSelected={isOpen && place.settings === entry.path} onClick={go(href)} />;
            })}
          </SideNavItem>;
        })}
      </SideNavSection>}
      <SideNavSection title="인스턴스 관리">
        {ADMIN_MENU.map(entry => item(entry.label, entry.icon, entry.path, place.admin === entry.path))}
      </SideNavSection>
    </SideNav>
    : <SideNav aria-label="데모 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }} resizable={resizable}
      header={<header className={styles.heading} data-folded={folded || undefined}>
        <WorkspaceSwitcher current={workspace} isFolded={folded} />{bell}
      </header>}
      topContent={folded
        ? <div className={styles.accountFolded}><button type="button" className={styles.avatarButton} aria-label="고재범 · 내 설정" onClick={openSettings}><DefaultAvatar seed="u1" name="고재범" /></button></div>
        : <div className={styles.account}><DefaultAvatar seed="u1" name="고재범" />
          <span className={styles.accountText}><Text weight="semibold" maxLines={1}>고재범</Text><Text type="supporting" color="secondary" maxLines={1}>데모 · 목데이터</Text></span>
          <IconButton label="내 설정" tooltip="내 설정" icon={<NavIcon name="settings" />} variant="ghost" size="sm" onClick={openSettings} />
        </div>}
      footer={<div className={styles.foot}>{workspace && item('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false)}{version}</div>}>
      <SideNavSection title="이슈" endContent={workspace && !folded ? <IssueMenuButton workspaceId={workspaceId} /> : undefined}>
        {workspace && issueMenu.map(entry => item(entry.label, entry.icon, issuePath(workspaceId, entry.path, scope), issueEntry?.key === entry.key))}
      </SideNavSection>
      {/* The scope of the issue menus: choosing a project keeps the menu in view and shows that project's (D-063). */}
      {workspace && !folded && <SideNavSection title="프로젝트" endContent={<IconButton label="프로젝트 만들기·관리" tooltip="프로젝트 만들기·관리" variant="ghost" size="sm"
        icon={<NavIcon name="plus" />} onClick={() => void navigate({ href: workspacePath(workspaceId, '/projects') })} />}>
        {item('전체', 'grid', issuePath(workspaceId, scopeBase), !!issueEntry && !scope)}
        {projects.map(project => {
          const href = issuePath(workspaceId, scopeBase, project.id);
          return <SideNavItem key={project.id} label={project.name} href={href} icon={projectMark(project.key)} isSelected={!!issueEntry && scope === project.id} onClick={go(href)} />;
        })}
      </SideNavSection>}
      <SideNavSection title="워크스페이스">
        {workspace && WORKSPACE_MENU.map(entry => item(entry.label, entry.icon, workspacePath(workspaceId, entry.path), place.workspaceSection === entry.path))}
      </SideNavSection>
      <SideNavSection title="UI 패턴">
        {PATTERN_MENU.map(entry => item(entry.label, entry.icon, entry.path, place.pattern === entry.path))}
      </SideNavSection>
    </SideNav>;

  // A phone's tab bar: the scope's first menus as tabs, everything else in 더보기 (the settings' too, with 돌아가기).
  const tab = (label: string, icon: string, href: string, isCurrent: boolean): ShellTab => ({ label, icon, href, isCurrent });
  // A phone in the workspace's settings: the page's own set as tabs (the workspace's, a project's or the instance's),
  // the rest of the settings in 더보기 with 돌아가기.
  const spaceSettingsTabs = place.admin
    ? ADMIN_MENU.map(entry => tab(entry.label, entry.icon, entry.path, place.admin === entry.path))
    : place.settingsProjectId
      ? PROJECT_SETTINGS_MENU.map(entry => tab(entry.label, entry.icon, projectSettingsPath(workspaceId, place.settingsProjectId!, entry.path), place.settings === entry.path))
      : WORKSPACE_SETTINGS_MENU.map(entry => tab(entry.label, entry.icon, workspaceSettingsPath(workspaceId, entry.path), place.settings === entry.path));
  const scopeTabs = isAccount
    ? ACCOUNT_MENU.map(entry => tab(entry.label, entry.icon, entry.path, place.account === entry.path))
    : isSpaceSettings ? spaceSettingsTabs
    : [...issueMenu.map(entry => tab(entry.label, entry.icon, issuePath(workspaceId, entry.path, scope), issueEntry?.key === entry.key)),
      ...WORKSPACE_MENU.map(entry => tab(entry.label, entry.icon, workspacePath(workspaceId, entry.path), place.workspaceSection === entry.path))];
  const count = 3;
  const more = isAccount ? [...scopeTabs.slice(count), tab('돌아가기', 'previous', lastWork || '/demo', false)] : isSpaceSettings ? [
    ...scopeTabs.slice(count),
    ...(place.admin || place.settingsProjectId ? [tab('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false)] : []),
    ...projects.filter(project => project.id !== place.settingsProjectId).map(project => tab(`${project.name} 설정`, 'board', projectSettingsPath(workspaceId, project.id), false)),
    ...(place.admin ? [] : [tab('인스턴스 관리', 'workflow', ADMIN_MENU[0]!.path, false)]),
    tab('돌아가기', 'previous', lastWork || '/demo', false),
  ] : [
    ...scopeTabs.slice(count),
    // The issue menus' scope, as the sidebar's 프로젝트 list chooses it.
    tab('범위 · 전체', 'grid', issuePath(workspaceId, scopeBase), !!issueEntry && !scope),
    ...projects.map(project => tab(`범위 · ${project.name}`, 'board', issuePath(workspaceId, scopeBase, project.id), !!issueEntry && scope === project.id)),
    tab('모든 프로젝트', 'grid', workspacePath(workspaceId, '/projects'), place.workspaceSection === '/projects'),
    tab('워크스페이스 설정', 'settings', workspaceSettingsPath(workspaceId), false),
    tab('공간 선택 · 전환', 'switcher', '/demo/workspaces', !!place.isWorkspaces),
    tab('내 설정', 'settings', '/demo/settings/profile', false),
    ...PATTERN_MENU.map(entry => tab(entry.label, entry.icon, entry.path, place.pattern === entry.path)),
  ];
  return <ShellFrame pathname={pathname} folded={folded} onFold={setFolded} trail={<Trail steps={steps} />} sidebar={sidebar} mobileEnd={bell}
    mobileNav={isSettings ? <ShellTabBar label="설정 메뉴" moreTitle={isAccount ? '계정' : place.admin ? '인스턴스 관리' : `${workspace?.name ?? ''} 설정`} tabs={scopeTabs.slice(0, count)} more={more} />
      : workspace ? <ShellTabBar label="워크스페이스 메뉴" moreTitle={`${workspace.name}${scope ? ` · ${projects.find(project => project.id === scope)?.name ?? ''}` : ''}`} tabs={scopeTabs.slice(0, count)} more={more} /> : undefined}>
    <Outlet />
  </ShellFrame>;
}
