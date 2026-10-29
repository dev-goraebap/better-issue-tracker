import type { LucideIcon } from 'lucide-react';
import { MARK_ICONS } from '@/shared/config';

const LEGACY: ReadonlySet<string> = new Set(MARK_ICONS);

/**
 * What a mark's icon value is (D-086, D-112): a Solar icon as `s:` and its name (`s:rocket`), one of the names the marks
 * used first (`list`, `board`…) drawn as the app's own icon (NavIcon), or a lucide icon by its component name
 * (`LayoutList`) picked before the marks were Solar's, drawn as the Solar icon it became where there is one.
 */
export type MarkKind = 'solar' | 'legacy' | 'lucide';

/**
 * The lucide icons the picker offered first, as what each is now: the app's own name or a Solar mark. A lucide icon
 * not here is still drawn by lucide.
 */
const FROM_LUCIDE: Readonly<Record<string, string>> = {
  LayoutList: 'list', Rows3: 'rows', SquareKanban: 'board', CalendarDays: 'calendar', Milestone: 'milestone', Scale: 'decision',
  BookOpen: 'session', Users: 'members', User: 'person', Flag: 'priority', Tag: 'label', Sparkles: 'agent', Folder: 'documents',
  GitBranch: 'branch', Workflow: 'workflow', ListTodo: 'tasks', Shield: 'shield', House: 'home',
  Rocket: 's:rocket', Star: 's:star', Heart: 's:heart', Target: 's:target', Lightbulb: 's:lightbulb', Bug: 's:bug', Code: 's:code',
  Palette: 's:palette', Briefcase: 's:case', Globe: 's:global', Zap: 's:bolt', Bell: 's:bell', Book: 's:book', Box: 's:box',
  Building2: 's:buildings', ChartColumn: 's:chart-2', CreditCard: 's:card', Database: 's:database', Gift: 's:gift',
  GraduationCap: 's:square-academic-cap', Package: 's:box', Smartphone: 's:smartphone', Trophy: 's:cup-star', Bot: 's:bot', Brain: 's:brain',
  Cloud: 's:cloud', Coffee: 's:cup-hot', Compass: 's:compass', Flame: 's:fire', Leaf: 's:leaf', Map: 's:map', Music: 's:music-note',
};

/** A mark's value as it is drawn now: a lucide icon the picker offered becomes its app or Solar mark. */
export const markOf = (value: string) => FROM_LUCIDE[value] ?? value;
export const markKind = (value: string): MarkKind => {
  const mark = markOf(value);
  return mark.startsWith('s:') ? 'solar' : LEGACY.has(mark) ? 'legacy' : 'lucide';
};

// Every Solar icon in its Linear style (virtual:solar-set, vite.config.ts), fetched once on first need as its own chunk;
// the app's first load carries only the icons it names.
let solar: Record<string, string> | undefined;
let loadingSolar: Promise<Record<string, string>> | undefined;
export const loadedSolar = () => solar;
export function loadSolar() {
  loadingSolar ??= import('virtual:solar-set').then(module => (solar = module.default));
  return loadingSolar;
}

// Every lucide icon, for a mark picked from lucide before (markKind lucide): fetched only if one is shown.
let lucide: Record<string, LucideIcon> | undefined;
let loadingLucide: Promise<Record<string, LucideIcon>> | undefined;
export const loadedLucide = () => lucide;
export function loadLucide() {
  loadingLucide ??= import('lucide-react/dist/esm/icons/index.mjs').then(module => {
    const all = ((module as { default?: Record<string, LucideIcon> }).default ?? module) as Record<string, LucideIcon>;
    lucide = Object.fromEntries(Object.entries(all).filter(([name]) => /^[A-Z]/.test(name)));
    return lucide;
  });
  return loadingLucide;
}

/** Words of a Solar icon's name, for search: `alarm-add` is alarm add, `bag-2` bag 2. */
export const iconWords = (name: string) => name.replace(/-/g, ' ');

/**
 * Korean words for the icons people look for most, so 달력 finds the calendars. Each points at English words of icon
 * names; the rest of the set is found by its English name.
 */
const KOREAN: Readonly<Record<string, string>> = {
  달력: 'calendar', 일정: 'calendar', 시계: 'clock', 시간: 'clock timer', 사람: 'user', 사용자: 'user', 팀: 'users group', 구성원: 'users group', 회의: 'users chat',
  폴더: 'folder', 파일: 'file', 문서: 'file text', 책: 'book', 집: 'home house', 홈: 'home house', 설정: 'settings cog', 별: 'star', 즐겨찾기: 'star bookmark',
  북마크: 'bookmark', 하트: 'heart', 좋아요: 'heart thumbs', 깃발: 'flag', 태그: 'tag', 라벨: 'tag', 링크: 'link', 목록: 'list', 할일: 'list todo check',
  체크: 'check', 보드: 'kanban', 칸반: 'kanban', 표: 'table', 차트: 'chart graph', 그래프: 'graph chart', 통계: 'chart', 데이터: 'database', 서버: 'server',
  클라우드: 'cloud', 구름: 'cloud', 해: 'sun', 달: 'moon', 번개: 'bolt lightning', 불: 'fire flame', 물: 'water waterdrop', 나무: 'tree', 꽃: 'flower', 잎: 'leaf',
  고양이: 'cat', 개: 'dog', 강아지: 'dog', 새: 'bird', 물고기: 'fish', 코드: 'code', 터미널: 'terminal', 버그: 'bug', 로켓: 'rocket', 메일: 'letter mailbox',
  편지: 'letter', 전화: 'phone', 카메라: 'camera', 사진: 'image camera', 영상: 'video videocamera', 음악: 'music note', 지도: 'map', 위치: 'map point', 지구: 'global globe earth',
  언어: 'languages', 잠금: 'lock', 보안: 'shield lock', 방패: 'shield', 열쇠: 'key', 알림: 'bell', 검색: 'magnifier', 대화: 'chat dialog', 댓글: 'chat',
  연필: 'pencil', 펜: 'pen', 디자인: 'palette pen', 붓: 'brush', 도구: 'wrench', 망치: 'hammer', 학교: 'academic cap', 병원: 'hospital',
  건물: 'buildings', 회사: 'buildings case', 가방: 'case bag', 자동차: 'car', 비행기: 'plane', 배: 'ship sailboat', 자전거: 'bike', 선물: 'gift',
  커피: 'cup hot', 컵: 'cup', 음식: 'utensils pizza', 피자: 'pizza', 장바구니: 'shopping cart', 쇼핑: 'shopping', 상자: 'box package', 택배: 'package truck',
  돈: 'dollar banknote wallet money', 지갑: 'wallet', 결제: 'card', 카드: 'card', 전구: 'lightbulb', 아이디어: 'lightbulb', 목표: 'target',
  트로피: 'cup star', 상: 'medal cup', 시작: 'play', 재생: 'play', 정지: 'pause square', 휴지통: 'trash', 삭제: 'trash', 다운로드: 'download',
  업로드: 'upload', 공유: 'share', 경고: 'danger', 정보: 'info', 질문: 'question help', 도움: 'help', 결정: 'scale', 저울: 'scale',
  브랜치: 'git branch', 깃: 'git', 흐름: 'workflow', 게임: 'gamepad', 헤드폰: 'headphones', 노트북: 'laptop', 컴퓨터: 'monitor computer',
  휴대폰: 'smartphone', 모바일: 'smartphone', 배터리: 'battery', 와이파이: 'wifi', 집중: 'target focus', 마법: 'magic wand', 반짝: 'stars',
  에이전트: 'bot stars', 로봇: 'bot', 인공지능: 'bot brain stars', 뇌: 'brain', 건강: 'heart pulse activity', 운동: 'dumbbell activity',
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
