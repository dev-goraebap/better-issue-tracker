/** A menu entry: where it goes (from its scope's root), its name and its icon (NavIcon). */
export type MenuEntry = { path: string; label: string; icon: string };

/**
 * The workspace's menu (D-064, D-071): 홈 (전체's issues and views, D-065), 문서함 and 구성원; the projects follow under
 * 프로젝트, and 워크스페이스 설정 sits at the menu's foot. The notices are not an entry but the bell at the menu's head
 * (D-059). A phone's tabs are these, then 더보기.
 */
export const WORKSPACE_MENU: readonly MenuEntry[] = [
  { path: '', label: '홈', icon: 'home' },
  { path: '/documents', label: '문서함', icon: 'documents' },
  { path: '/members', label: '구성원', icon: 'members' },
];

/**
 * The workspace's settings, which 워크스페이스 설정 opens: the menu turns into these, headed by 돌아가기 (or Esc). The
 * workspace's pages first, then each project's under its name (D-061). Addresses: /w/$workspaceId/settings/…, a project's
 * /w/$workspaceId/settings/projects/$projectId/….
 */
export const WORKSPACE_SETTINGS_MENU: readonly MenuEntry[] = [
  { path: '/general', label: '일반', icon: 'settings' },
  { path: '/roles', label: '역할', icon: 'shield' },
  { path: '/labels', label: '라벨', icon: 'label' },
];
export const PROJECT_SETTINGS_MENU: readonly MenuEntry[] = [
  { path: '/general', label: '일반', icon: 'settings' },
  { path: '/board', label: '보드 칸', icon: 'board' },
];

/** The member's own settings, which the profile card's gear opens, outside any workspace (/settings/…). */
export const ACCOUNT_MENU: readonly MenuEntry[] = [
  { path: '/settings/profile', label: '프로필', icon: 'person' },
  { path: '/settings/appearance', label: '디스플레이', icon: 'grid' },
  { path: '/settings/api-keys', label: 'API 키', icon: 'key' },
  { path: '/settings/security', label: '시큐리티', icon: 'lock' },
];

export const workspacePath = (workspaceId: string, path = '') => `/w/${workspaceId}${path}`;
export const projectPath = (workspaceId: string, projectId: string, path = '') => `/w/${workspaceId}/p/${projectId}${path}`;
export const workspaceSettingsPath = (workspaceId: string, path = '/general') => `/w/${workspaceId}/settings${path}`;
export const projectSettingsPath = (workspaceId: string, projectId: string, path = '/general') => `/w/${workspaceId}/settings/projects/${projectId}${path}`;

/** Where an address is: its workspace, project, the menu entry it belongs to, and the item a page shows. */
export type AppPlace = {
  workspaceId?: string; projectId?: string;
  /** The workspace menu entry's path ('' for 홈), when the page is the workspace's. */
  workspaceSection?: string;
  /** A work item's page, or 'new' for 새 이슈. */
  itemId?: string;
  /** The item's page is its 편집 form. */
  isEditing?: boolean;
  isWorkspaces?: boolean;
  /** An account settings page's address, when the menu is the member's own settings. */
  account?: string;
  /** A workspace settings page's entry path ('/general', …), when the menu is the workspace's settings. */
  settings?: string;
  /** The project whose settings page it is, within the workspace's settings. */
  settingsProjectId?: string;
};

export function appPlace(pathname: string): AppPlace {
  const path = pathname.replace(/\/$/, '');
  if (path === '/workspaces') return { isWorkspaces: true };
  if (path.startsWith('/settings/')) return { account: path };
  const match = /^\/w\/([^/]+)(\/.*)?$/.exec(path);
  if (!match) return {};
  const [, workspaceId, rest = ''] = match;
  const settings = /^\/settings(?:\/projects\/([^/]+))?(\/[^/]+)$/.exec(rest);
  if (settings) return { workspaceId, settingsProjectId: settings[1], settings: settings[2] };
  const project = /^\/p\/([^/]+)(\/.*)?$/.exec(rest);
  if (!project) return { workspaceId, workspaceSection: rest.startsWith('/inbox') ? '/inbox' : rest };
  const [, projectId, inner = ''] = project;
  const item = /^\/work-items\/([^/]+)(\/edit)?$/.exec(inner);
  return { workspaceId, projectId, itemId: item?.[1], isEditing: !!item?.[2] };
}
