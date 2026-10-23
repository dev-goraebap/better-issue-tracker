/**
 * The demo's data: fixed, in memory, shaped like BIT's (work items, decisions, sessions, notifications, members), so
 * every pattern page shows real-looking rows without a server. Nothing here is fetched or saved.
 */
export type Person = { id: string; name: string; kind: 'user' | 'agent' };
export type Status = 'todo' | 'doing' | 'review' | 'done';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type WorkItem = {
  id: string; key: string; title: string; status: Status; priority: Priority; assigneeId?: string; labels: string[];
  createdAt: string; updatedAt: string; dueAt?: string; comments: number; decisionKey?: string;
};
export type Decision = { id: string; key: string; title: string; status: 'proposed' | 'accepted' | 'superseded'; ownerId: string; decidedAt?: string; progress: [done: number, total: number] };
export type Notice = { id: string; kind: 'mention' | 'assigned' | 'decision' | 'review'; title: string; target: string; actorId: string; at: string; isRead: boolean };

export const PEOPLE: Person[] = [
  { id: 'u1', name: '고재범', kind: 'user' },
  { id: 'u2', name: '김하늘', kind: 'user' },
  { id: 'u3', name: '박서준', kind: 'user' },
  { id: 'u4', name: '이도윤', kind: 'user' },
  { id: 'a1', name: 'Codex', kind: 'agent' },
  { id: 'a2', name: 'Claude', kind: 'agent' },
];
export const personOf = (id?: string) => PEOPLE.find(person => person.id === id);

export const STATUS_LABELS: Record<Status, string> = { todo: '할 일', doing: '진행 중', review: '검토', done: '완료' };
export const STATUS_COLORS = { todo: 'gray', doing: 'blue', review: 'orange', done: 'green' } as const;
export const PRIORITY_LABELS: Record<Priority, string> = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' };
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const LABELS = ['서버', '화면', 'MCP', '문서', '배포', '버그'];

const TITLES = [
  '결정 목록 화면의 상태 필터 추가', '세션 일괄 기록 API 문서화', 'MCP get_context 도구 응답 크기 제한', '작업 상세 우측 연결 패널 배치',
  'Docker V4 업그레이드 검증', '링크 순환 검사 성능 개선', '댓글 작성자 스냅샷 표시', '프로젝트 키 변경 후 옛 참조 해석',
  '보드 칸 사이 드래그 위치 보존', '모바일 하단 메뉴 더보기 시트 정리', '활동 이력 페이로드 128KiB 상한 검사', 'API 키 폐기 시 세션 즉시 무효화',
  '산출물 버전 상태 전이 설계', 'Git 웹훅 서명 검증 어댑터', '결정 대체 다이얼로그 버전 충돌 처리', '검색 Inbox 라벨 통합 계획',
  '로그인 화면 입력 크기 정리', 'Litestream 복구 절차 점검', '빈 목록 상태 문구 다듬기', '작업 일괄 보관 동작 추가',
  'SQLite 잠금 대기 시간 조정', '워크스페이스 초대 만료 안내', '프로젝트 진행률 계산 캐시', 'OpenAPI 타입 생성 CI 검사',
];
const STATUSES: Status[] = ['todo', 'doing', 'review', 'done'];
const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];
const day = (offset: number, hour = 10) => new Date(Date.UTC(2026, 9, 23 - offset, hour - 9, (offset * 7) % 60)).toISOString();

export const WORK_ITEMS: WorkItem[] = TITLES.map((title, index) => ({
  id: `w${index + 1}`,
  key: `BIT-${120 - index}`,
  title,
  status: STATUSES[(index * 3 + 1) % 4],
  priority: PRIORITIES[(index * 5 + 2) % 4],
  assigneeId: index % 7 === 6 ? undefined : PEOPLE[index % PEOPLE.length].id,
  labels: [LABELS[index % LABELS.length], ...(index % 3 === 0 ? [LABELS[(index + 2) % LABELS.length]] : [])],
  createdAt: day(index * 2 + 3),
  updatedAt: day(Math.floor(index / 2), 9 + (index % 8)),
  dueAt: index % 4 === 0 ? day(-((index % 9) + 1)) : undefined,
  comments: (index * 7) % 5,
  decisionKey: index % 5 === 1 ? `D-0${10 + (index % 9)}` : undefined,
}));

export const DECISIONS: Decision[] = [
  { id: 'd1', key: 'D-057', title: '컨트롤 크기는 Astryx 기본과 화면 맥락을 따른다', status: 'accepted', ownerId: 'u1', decidedAt: day(0), progress: [2, 3] },
  { id: 'd2', key: 'D-056', title: '긴 정정 이력은 필드별 조각으로 나눠 저장한다', status: 'accepted', ownerId: 'a1', decidedAt: day(1), progress: [4, 4] },
  { id: 'd3', key: 'D-055', title: '세션 일괄 기록은 한 트랜잭션에서 처리한다', status: 'accepted', ownerId: 'u2', decidedAt: day(2), progress: [1, 2] },
  { id: 'd4', key: 'D-058', title: '데모 페이지를 화면 패턴의 기준으로 삼는다', status: 'proposed', ownerId: 'a2', progress: [0, 0] },
  { id: 'd5', key: 'D-052', title: '모든 입력을 50px로 키운다', status: 'superseded', ownerId: 'u1', decidedAt: day(6), progress: [3, 3] },
];

export const NOTICES: Notice[] = [
  { id: 'n1', kind: 'mention', title: '고재범님이 댓글에서 언급했습니다', target: 'BIT-118 MCP get_context 도구 응답 크기 제한', actorId: 'u1', at: day(0, 11), isRead: false },
  { id: 'n2', kind: 'assigned', title: 'Codex가 작업을 배정했습니다', target: 'BIT-116 Docker V4 업그레이드 검증', actorId: 'a1', at: day(0, 9), isRead: false },
  { id: 'n3', kind: 'decision', title: '결정이 확정되었습니다', target: 'D-057 컨트롤 크기는 Astryx 기본과 화면 맥락을 따른다', actorId: 'u1', at: day(1, 15), isRead: false },
  { id: 'n4', kind: 'review', title: '검토 요청이 왔습니다', target: 'BIT-113 프로젝트 키 변경 후 옛 참조 해석', actorId: 'u3', at: day(1, 10), isRead: true },
  { id: 'n5', kind: 'mention', title: 'Claude가 세션 요약에서 언급했습니다', target: 'S-014 T-005 설계 회의', actorId: 'a2', at: day(2, 14), isRead: true },
  { id: 'n6', kind: 'assigned', title: '김하늘님이 작업을 배정했습니다', target: 'BIT-110 모바일 하단 메뉴 더보기 시트 정리', actorId: 'u2', at: day(4, 16), isRead: true },
  { id: 'n7', kind: 'decision', title: '결정이 대체되었습니다', target: 'D-052 모든 입력을 50px로 키운다', actorId: 'u1', at: day(6, 13), isRead: true },
];

/** A date as the lists show it: 10월 23일, with the year only when it is not this one. */
export function dateText(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === 2026;
  return date.toLocaleDateString('ko-KR', { ...(sameYear ? {} : { year: 'numeric' }), month: 'long', day: 'numeric' });
}
/** A moment as a relative phrase for activity: 방금, 3시간 전, 2일 전. */
export function agoText(iso: string) {
  const hours = Math.max(0, Math.round((Date.UTC(2026, 9, 23, 3) - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}
