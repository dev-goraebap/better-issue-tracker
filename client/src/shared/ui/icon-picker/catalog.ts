import type { LucideIcon } from 'lucide-react';

/**
 * What a mark's icon value is (D-086): a lucide icon by its component name (`LayoutList`), or one of the names the marks
 * used before (`list`, `board`…), which the app draws with its own NavIcon.
 */
export type MarkKind = 'icon' | 'legacy';

/** The marks' first icons (shared/config MARK_ICONS) and the lucide icon each one is, so the picker shows it as chosen. */
export const LEGACY_MARKS: Readonly<Record<string, string>> = {
  list: 'LayoutList', rows: 'Rows3', board: 'SquareKanban', calendar: 'CalendarDays', milestone: 'Milestone', decision: 'Scale',
  session: 'BookOpen', members: 'Users', person: 'User', priority: 'Flag', label: 'Tag', agent: 'Sparkles', documents: 'Folder',
  branch: 'GitBranch', workflow: 'Workflow', tasks: 'ListTodo', shield: 'Shield', home: 'House',
};

export const markKind = (value: string): MarkKind => (value in LEGACY_MARKS ? 'legacy' : 'icon');
/** The lucide name a value stands for, for marking it chosen in the grid. */
export const iconOf = (value: string) => LEGACY_MARKS[value] ?? value;

// Every lucide icon, fetched once on first need as its own chunk; the app's first load carries only the icons it names.
let icons: Record<string, LucideIcon> | undefined;
let loadingIcons: Promise<Record<string, LucideIcon>> | undefined;
export const loadedIcons = () => icons;
export function loadIcons() {
  loadingIcons ??= import('lucide-react/dist/esm/icons/index.mjs').then(module => {
    const all = ((module as { default?: Record<string, LucideIcon> }).default ?? module) as Record<string, LucideIcon>;
    icons = Object.fromEntries(Object.entries(all).filter(([name]) => /^[A-Z]/.test(name)));
    return icons;
  });
  return loadingIcons;
}

/** Words of an icon's name, for search: `ArrowDownWideNarrow` is arrow down wide narrow, `Clock10` clock 10. */
export const iconWords = (name: string) => name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([0-9])([A-Z])/g, '$1 $2').toLowerCase();

/**
 * Korean words for the icons people look for most, so 달력 finds the calendars. Each points at English words of icon
 * names; the rest of the set is found by its English name.
 */
const KOREAN: Readonly<Record<string, string>> = {
  달력: 'calendar', 일정: 'calendar', 시계: 'clock', 시간: 'clock timer', 사람: 'user', 사용자: 'user', 팀: 'users', 구성원: 'users', 회의: 'users message',
  폴더: 'folder', 파일: 'file', 문서: 'file text', 책: 'book', 집: 'house', 홈: 'house', 설정: 'settings cog', 별: 'star', 즐겨찾기: 'star bookmark',
  북마크: 'bookmark', 하트: 'heart', 좋아요: 'heart thumbs', 깃발: 'flag', 태그: 'tag', 라벨: 'tag', 링크: 'link', 목록: 'list', 할일: 'list todo check',
  체크: 'check', 보드: 'kanban', 칸반: 'kanban', 표: 'table', 차트: 'chart', 그래프: 'chart', 통계: 'chart', 데이터: 'database', 서버: 'server',
  클라우드: 'cloud', 구름: 'cloud', 해: 'sun', 달: 'moon', 번개: 'zap', 불: 'flame', 물: 'droplet', 나무: 'tree', 꽃: 'flower', 잎: 'leaf',
  고양이: 'cat', 개: 'dog', 강아지: 'dog', 새: 'bird', 물고기: 'fish', 코드: 'code', 터미널: 'terminal', 버그: 'bug', 로켓: 'rocket', 메일: 'mail',
  편지: 'mail', 전화: 'phone', 카메라: 'camera', 사진: 'image camera', 영상: 'video film', 음악: 'music', 지도: 'map', 위치: 'map pin', 지구: 'globe earth',
  언어: 'languages', 잠금: 'lock', 보안: 'shield lock', 방패: 'shield', 열쇠: 'key', 알림: 'bell', 검색: 'search', 대화: 'message', 댓글: 'message',
  연필: 'pencil', 펜: 'pen', 디자인: 'palette pen', 붓: 'brush', 도구: 'wrench', 망치: 'hammer', 학교: 'school graduation', 병원: 'hospital',
  건물: 'building', 회사: 'building briefcase', 가방: 'briefcase', 자동차: 'car', 비행기: 'plane', 배: 'ship sailboat', 자전거: 'bike', 선물: 'gift',
  커피: 'coffee', 컵: 'cup', 음식: 'utensils pizza', 피자: 'pizza', 장바구니: 'shopping cart', 쇼핑: 'shopping', 상자: 'box package', 택배: 'package truck',
  돈: 'dollar banknote wallet coins', 지갑: 'wallet', 결제: 'credit card', 카드: 'card', 전구: 'lightbulb', 아이디어: 'lightbulb', 목표: 'target',
  트로피: 'trophy', 상: 'award trophy', 시작: 'play', 재생: 'play', 정지: 'pause square', 휴지통: 'trash', 삭제: 'trash', 다운로드: 'download',
  업로드: 'upload', 공유: 'share', 경고: 'alert triangle', 정보: 'info', 질문: 'help circle question', 도움: 'help', 결정: 'scale', 저울: 'scale',
  브랜치: 'git branch', 깃: 'git', 흐름: 'workflow', 게임: 'gamepad', 헤드폰: 'headphones', 노트북: 'laptop', 컴퓨터: 'monitor computer',
  휴대폰: 'smartphone', 모바일: 'smartphone', 배터리: 'battery', 와이파이: 'wifi', 집중: 'target focus', 마법: 'sparkles wand', 반짝: 'sparkles',
  에이전트: 'bot sparkles', 로봇: 'bot', 인공지능: 'bot brain sparkles', 뇌: 'brain', 건강: 'heart pulse activity', 운동: 'dumbbell activity',
};

/** The icon names a query finds: English words of the name, or a Korean word's English words. */
export function searchIcons(names: readonly string[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  const korean = Object.entries(KOREAN).filter(([word]) => word.includes(q) || q.includes(word)).flatMap(([, english]) => english.split(' '));
  // The closest first: the whole name, a name that starts with the query, a word of it, then a Korean word's icons.
  const rank = (name: string) => {
    const words = iconWords(name);
    if (words.replace(/ /g, '') === q.replace(/ /g, '')) return 0;
    if (words.startsWith(q)) return 1;
    if (words.split(' ').includes(q)) return 2;
    if (words.includes(q)) return 3;
    return korean.some(word => words.split(' ').includes(word)) ? 4 : 9;
  };
  return names.map(name => ({ name, score: rank(name) })).filter(hit => hit.score < 9).sort((a, b) => a.score - b.score).map(hit => hit.name);
}
