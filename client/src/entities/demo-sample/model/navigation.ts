/**
 * The demo's menu: one entry per screen pattern, grouped as the sidebar shows them. pattern says in a line what the page
 * demonstrates, so the home page and an agent reading this file know which page to copy for a new screen.
 */
export type DemoEntry = { path: string; label: string; icon: string; group: string; pattern: string; isMobileTab?: boolean };

export const DEMO_NAVIGATION: readonly DemoEntry[] = [
  { path: '/demo', label: '홈', icon: 'home', group: '', isMobileTab: true, pattern: '섹션 머리와 요약 수치, 최근 항목 행 목록을 모은 대시보드' },
  { path: '/demo/inbox', label: 'Inbox', icon: 'inbox', group: '', isMobileTab: true, pattern: '읽지 않은 행 강조, 만들기가 아닌 주 동작(모두 읽음), 하나만 고르는 필터' },
  { path: '/demo/table', label: '작업 표', icon: 'table', group: '목록', isMobileTab: true, pattern: '머리 줄 도구(검색·필터·정렬)와 Plane식 표, 열 머리 정렬, 더 보기' },
  { path: '/demo/tabs', label: '탭 목록', icon: 'rows', group: '목록', pattern: '탭 줄과 탭 줄 끝의 도구, 탭마다 다른 목록' },
  { path: '/demo/board', label: '보드', icon: 'board', group: '목록', pattern: '전체 폭 칸반, 머리 줄의 보기 전환(lead)' },
  { path: '/demo/items/w3', label: '작업 상세', icon: 'document', group: '한 건', pattern: '좁은 폭 상세, 본문과 오른쪽 속성 패널, 연결·활동 구역' },
  { path: '/demo/items/new', label: '작성 양식', icon: 'edit', group: '한 건', pattern: '좁은 폭 양식, 바닥 줄(PageFoot)의 취소·저장' },
  { path: '/demo/settings', label: '설정', icon: 'settings', group: '한 건', pattern: '섹션 머리로 나눈 설정, 행 단위 항목과 위험 구역' },
  { path: '/demo/states', label: '상태', icon: 'status', group: '상태와 창', pattern: '빈 목록·검색 없음·찾을 수 없음·오류·로딩 상태' },
  { path: '/demo/dialogs', label: '대화상자', icon: 'comment', group: '상태와 창', pattern: '짧은 창(입력·확인·삭제)과 휴대폰 바텀시트' },
];

/** The menu entry a demo address belongs to: its own, or the list a detail page sits under. */
export function demoEntryOf(pathname: string): DemoEntry | undefined {
  if (pathname === '/demo/items/new') return DEMO_NAVIGATION.find(entry => entry.path === pathname);
  if (pathname.startsWith('/demo/items/')) return DEMO_NAVIGATION.find(entry => entry.path === '/demo/table');
  return DEMO_NAVIGATION.find(entry => entry.path === pathname.replace(/\/$/, ''));
}
