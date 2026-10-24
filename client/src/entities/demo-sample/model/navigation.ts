import { itemOf, projectOf, workspaceOf } from './mock';

/**
 * The demo's menus and addresses: the real app's (shared/config WORKSPACE_NAVIGATION, the router's /w/$workspaceId/…
 * and /p/$projectId/…) under /demo, so a page here sits where its real page will. pattern says in a line what each
 * page demonstrates, for the home page and for an agent choosing which page to copy.
 */
export type DemoEntry = { path: string; label: string; icon: string; pattern: string };

/**
 * The notices: not a menu entry but the bell at the menu's head beside the workspace's name (a phone's header row),
 * lit while any are unread (D-059).
 */
export const NOTICE_ENTRY: DemoEntry = { path: '/inbox', label: '알림', icon: 'bell', pattern: '데스크톱은 왼쪽 좁은 목록과 오른쪽 내용, 휴대폰은 목록에서 전체 화면 상세로' };

/**
 * The workspace's menu (D-064): 홈 (its widgets the member arranges), 구성원 and 문서함; the projects follow under
 * 프로젝트, and 워크스페이스 설정 sits at the menu's foot. A phone's tabs are these, then 더보기.
 */
export const WORKSPACE_MENU: readonly DemoEntry[] = [
  { path: '', label: '홈', icon: 'home', pattern: '활동 잔디·최근 활동 등 위젯, 순서와 보이기를 고르는 홈 구성 창' },
  { path: '/members', label: '구성원', icon: 'members', pattern: '구성원 목록(데스크톱은 표, 휴대폰은 카드)과 초대 탭' },
  { path: '/documents', label: '문서함', icon: 'documents', pattern: '아직 준비 중인 기능의 빈 상태와 안내' },
];

/**
 * A project's page (D-064): no menu under it in the sidebar, its parts are the tabs in the tab row. 작업 is seen as a
 * list (a table on a desktop), a calendar, a kanban or a timeline; 백로그 only as a list of rows; 노트 as Keep-like
 * cards; 결정기록 as a history running down the page.
 */
export type ProjectTab = 'work' | 'backlog' | 'notes' | 'decisions';
export const PROJECT_TABS: readonly (DemoEntry & { value: ProjectTab })[] = [
  { value: 'work', path: '', label: '작업', icon: 'board', pattern: '리스트·캘린더·칸반·타임라인 보기' },
  { value: 'backlog', path: '?tab=backlog', label: '백로그', icon: 'rows', pattern: '시작하지 않은 작업의 행 목록(표가 아닌 유일한 목록)' },
  { value: 'notes', path: '?tab=notes', label: '노트', icon: 'session', pattern: '구글 Keep처럼 크기대로 쌓이는 카드' },
  { value: 'decisions', path: '?tab=decisions', label: '결정기록', icon: 'decision', pattern: '위에서 아래로 흐르는 히스토리 타임라인' },
];

/**
 * The workspace's settings, which 워크스페이스 설정 at the menu's foot opens: the menu turns into these, headed by
 * 돌아가기 (or Esc) as the member's own settings are. The workspace's pages first, then each project's (PROJECT_SETTINGS_MENU
 * under its name, as Kaneo lays them out), then the instance's for its administrators (ADMIN_MENU). Addresses:
 * /w/$workspaceId/settings/…, a project's /w/$workspaceId/settings/projects/$projectId/…, the instance's /admin/….
 */
export const WORKSPACE_SETTINGS_MENU: readonly DemoEntry[] = [
  { path: '/general', label: '일반', icon: 'settings', pattern: '로고·이름·설명, 소유권 이전, 위험 구역' },
  { path: '/roles', label: '역할', icon: 'shield', pattern: '역할마다 할 수 있는 일을 읽는 표' },
  { path: '/labels', label: '라벨', icon: 'label', pattern: '색과 이름, 쓰는 작업 수가 있는 목록과 추가 짧은 창' },
  { path: '/integrations', label: '연동', icon: 'link', pattern: 'Git 서버 연결과 복사해 쓰는 웹훅 주소' },
];
export const PROJECT_SETTINGS_MENU: readonly DemoEntry[] = [
  { path: '/general', label: '일반', icon: 'settings', pattern: '이름·키·설명, 보관과 삭제' },
  { path: '/board', label: '보드 칸', icon: 'board', pattern: '칸의 순서·색과 완료 칸 표시' },
  { path: '/control', label: '통제', icon: 'lock', pattern: '개인 모드와 팀 모드, 팀 모드의 잠금·승인' },
  { path: '/repository', label: '저장소', icon: 'branch', pattern: '연결한 Git 저장소와 마지막으로 받은 웹훅' },
];
/** The instance's settings, outside any workspace; only its administrators see them. */
export const ADMIN_MENU: readonly DemoEntry[] = [
  { path: '/demo/admin/users', label: '사용자', icon: 'people', pattern: '인스턴스의 모든 사용자, 관리자 표시와 계정 잠금' },
  { path: '/demo/admin/workspaces', label: '워크스페이스', icon: 'grid', pattern: '인스턴스의 모든 워크스페이스와 소유자' },
  { path: '/demo/admin/features', label: '서버 기능', icon: 'workflow', pattern: '서버가 켠 선택 기능(메일·Git·파일 저장소·문서 변환)의 상태' },
];

/**
 * The member's own settings, which the profile card's gear opens: the menu turns into these under 계정, headed by
 * 돌아가기 (or Esc) back to where the member was. Addresses as the real /settings/… (account, outside any workspace).
 */
export const ACCOUNT_MENU: readonly DemoEntry[] = [
  { path: '/demo/settings/profile', label: '프로필', icon: 'person', pattern: '설정 카드: 행마다 이름·설명과 오른쪽 조작, 위험 구역' },
  { path: '/demo/settings/appearance', label: '디스플레이', icon: 'grid', pattern: '바로 적용되는 화면 모드·레이아웃 선택' },
  { path: '/demo/settings/notifications', label: '알림', icon: 'bell', pattern: '받을 알림 종류별 스위치' },
  { path: '/demo/settings/api-keys', label: 'API 키', icon: 'key', pattern: '키 목록 표와 발급 짧은 창, 한 번만 보이는 키' },
  { path: '/demo/settings/security', label: '시큐리티', icon: 'lock', pattern: '비밀번호 변경과 로그인된 기기 목록' },
];

/** Pages that show a pattern rather than a menu of the app. */
export const PATTERN_MENU: readonly DemoEntry[] = [
  { path: '/demo/patterns/states', label: '상태', icon: 'status', pattern: '빈 목록·검색 없음·찾을 수 없음·오류·로딩' },
  { path: '/demo/patterns/dialogs', label: '대화상자', icon: 'comment', pattern: '짧은 창(입력·확인·삭제)과 휴대폰 바텀시트' },
];

export const workspacePath = (workspaceId: string, path = '') => `/demo/w/${workspaceId}${path}`;

export const projectPath = (workspaceId: string, projectId: string, path = '') => `/demo/w/${workspaceId}/p/${projectId}${path}`;
export const workspaceSettingsPath = (workspaceId: string, path = '/general') => `/demo/w/${workspaceId}/settings${path}`;
export const projectSettingsPath = (workspaceId: string, projectId: string, path = '/general') =>
  `/demo/w/${workspaceId}/settings/projects/${projectId}${path}`;

/** Where a demo address is: its workspace, project, the menu entry it belongs to, and the item a page shows. */
export type DemoPlace = {
  workspaceId?: string; projectId?: string;
  /** The workspace menu entry's path ('' for 홈), when the page is the workspace's. */
  workspaceSection?: string;
  /** The project menu entry's path ('' for 작업), when the page is a project's. */
  projectSection?: string;
  /** A work item's page, or 'new' for the form. */
  itemId?: string;
  noticeId?: string;
  isWorkspaces?: boolean; pattern?: string;
  /** An account settings page's address, when the menu is the member's own settings. */
  account?: string;
  /** A workspace settings page's entry path ('/general', …), when the menu is the workspace's settings. */
  settings?: string;
  /** The project whose settings page it is, within the workspace's settings. */
  settingsProjectId?: string;
  /** An instance settings page's address (/demo/admin/…), shown with the workspace's settings. */
  admin?: string;
};

export function demoPlace(pathname: string): DemoPlace {
  const path = pathname.replace(/\/$/, '');
  if (path === '/demo/workspaces') return { isWorkspaces: true };
  if (path.startsWith('/demo/patterns/')) return { pattern: path };
  if (path.startsWith('/demo/settings/')) return { account: path };
  if (path.startsWith('/demo/admin/')) return { admin: path };
  const match = /^\/demo\/w\/([^/]+)(\/.*)?$/.exec(path);
  if (!match) return {};
  const [, workspaceId, rest = ''] = match;
  const project = /^\/p\/([^/]+)(\/.*)?$/.exec(rest);
  const settings = /^\/settings(?:\/projects\/([^/]+))?(\/[^/]+)$/.exec(rest);
  if (settings) return { workspaceId, settingsProjectId: settings[1], settings: settings[2] };
  if (!project) {
    const notice = /^\/inbox\/([^/]+)$/.exec(rest);
    return { workspaceId, workspaceSection: notice ? '/inbox' : rest, noticeId: notice?.[1] };
  }
  const [, projectId, inner = ''] = project;
  const item = /^\/work-items\/([^/]+)$/.exec(inner);
  return { workspaceId, projectId, projectSection: item ? '' : inner, itemId: item?.[1] };
}

/** The trail's names for a place: the workspace, the project, then the page (a work item by its key). */
export function placeNames(place: DemoPlace) {
  const workspace = workspaceOf(place.workspaceId);
  const project = projectOf(place.projectId);
  const section = place.projectId
    ? PROJECT_TABS[0]
    : [NOTICE_ENTRY, ...WORKSPACE_MENU].find(entry => entry.path === place.workspaceSection) ?? (place.workspaceSection === '/projects' ? { label: '모든 프로젝트' } : undefined);
  const item = place.itemId === 'new' ? '새 작업' : itemOf(place.itemId)?.key;
  return { workspace: workspace?.name, project: project?.name, section: section?.label, item, settingsProject: projectOf(place.settingsProjectId)?.name };
}
