import { itemOf, projectOf, workspaceOf } from './mock';

/**
 * The demo's menus and addresses: the real app's (shared/config WORKSPACE_NAVIGATION, the router's /w/$workspaceId/…
 * and /p/$projectId/…) under /demo, so a page here sits where its real page will. pattern says in a line what each
 * page demonstrates, for the home page and for an agent choosing which page to copy.
 */
export type DemoEntry = { path: string; label: string; icon: string; pattern: string };

/** The workspace's menu, as the real sidebar's (D-034's phone tabs: the first three, then 더보기). */
export const WORKSPACE_MENU: readonly DemoEntry[] = [
  { path: '', label: '홈', icon: 'home', pattern: '섹션 머리, 요약 수치 줄, 최근 항목 행 목록을 모은 대시보드' },
  { path: '/inbox', label: 'Inbox', icon: 'inbox', pattern: '데스크톱은 왼쪽 좁은 목록과 오른쪽 내용, 휴대폰은 목록에서 전체 화면 상세로' },
  { path: '/my-tasks', label: 'My Tasks', icon: 'tasks', pattern: '머리 줄 도구(검색·필터·정렬)와 Plane식 표, 열 머리 정렬, 목록 끝 요약 줄' },
  { path: '/members', label: 'Members', icon: 'members', pattern: '탭(멤버·초대)마다 다른 표, 행 끝의 역할 선택' },
  { path: '/documents', label: '문서함', icon: 'documents', pattern: '아직 준비 중인 기능의 빈 상태와 안내' },
];
export const WORKSPACE_TABS = 3;

/** A project's menu, as docs/05-ui's side menu: work (its views are tabs), decisions, sessions, artifacts, settings. */
export const PROJECT_MENU: readonly DemoEntry[] = [
  { path: '', label: '작업', icon: 'board', pattern: '보기 탭(보드·목록·백로그·타임라인), 전체 폭 칸반과 표' },
  { path: '/decisions', label: '결정', icon: 'decision', pattern: '상태 탭과 탭 줄 끝의 도구, 계산된 이행 진행 막대' },
  { path: '/sessions', label: '세션·회의', icon: 'session', pattern: '종류 표시와 참석자 아바타 묶음이 있는 행 목록' },
  { path: '/artifacts', label: '산출물', icon: 'documents', pattern: '아직 준비 중인 기능의 빈 상태' },
  { path: '/settings', label: '설정', icon: 'settings', pattern: '섹션 머리로 나눈 설정, 행 단위 항목과 위험 구역' },
];
export const PROJECT_TABS = 3;

/** Pages that show a pattern rather than a menu of the app. */
export const PATTERN_MENU: readonly DemoEntry[] = [
  { path: '/demo/patterns/states', label: '상태', icon: 'status', pattern: '빈 목록·검색 없음·찾을 수 없음·오류·로딩' },
  { path: '/demo/patterns/dialogs', label: '대화상자', icon: 'comment', pattern: '짧은 창(입력·확인·삭제)과 휴대폰 바텀시트' },
];

export const workspacePath = (workspaceId: string, path = '') => `/demo/w/${workspaceId}${path}`;
export const projectPath = (workspaceId: string, projectId: string, path = '') => `/demo/w/${workspaceId}/p/${projectId}${path}`;

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
};

export function demoPlace(pathname: string): DemoPlace {
  const path = pathname.replace(/\/$/, '');
  if (path === '/demo/workspaces') return { isWorkspaces: true };
  if (path.startsWith('/demo/patterns/')) return { pattern: path };
  const match = /^\/demo\/w\/([^/]+)(\/.*)?$/.exec(path);
  if (!match) return {};
  const [, workspaceId, rest = ''] = match;
  const project = /^\/p\/([^/]+)(\/.*)?$/.exec(rest);
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
    ? PROJECT_MENU.find(entry => entry.path === place.projectSection)
    : WORKSPACE_MENU.find(entry => entry.path === place.workspaceSection) ?? (place.workspaceSection === '/projects' ? { label: '모든 프로젝트' } : place.workspaceSection === '/settings' ? { label: '워크스페이스 설정' } : undefined);
  const item = place.itemId === 'new' ? '새 작업' : itemOf(place.itemId)?.key;
  return { workspace: workspace?.name, project: project?.name, section: section?.label, item };
}
