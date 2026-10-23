/**
 * The demo's data: fixed, in memory, shaped like BIT's (workspaces, projects, work items, decisions, sessions,
 * notifications, members), so every demo page shows real-looking rows at the real addresses without a server. Nothing
 * here is fetched or saved.
 */
export type Person = { id: string; name: string; kind: 'user' | 'agent'; email?: string; role?: Role };
export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type Workspace = { id: string; name: string; myRole: Role; projects: number; members: number };
export type Project = { id: string; workspaceId: string; key: string; name: string; status: 'active' | 'archived'; leadId: string; updatedAt: string };
export type Status = 'todo' | 'doing' | 'review' | 'done';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type WorkItem = {
  id: string; projectId: string; key: string; title: string; status: Status; priority: Priority; assigneeId?: string; labels: string[];
  createdAt: string; updatedAt: string; dueAt?: string; comments: number; decisionKey?: string;
};
export type Decision = { id: string; projectId: string; key: string; title: string; status: 'proposed' | 'accepted' | 'superseded'; ownerId: string; decidedAt?: string; progress: [done: number, total: number] };
export type Session = { id: string; projectId: string; key: string; type: 'meeting' | 'agent_session'; title: string; occurredAt: string; participantIds: string[]; decisions: number };
export type Notice = {
  id: string; kind: 'mention' | 'assigned' | 'decision' | 'review'; title: string; actorId: string; at: string; isRead: boolean;
  /** What the notice is about, opened from its detail. */
  target: { type: 'work_item' | 'decision' | 'session'; key: string; title: string; projectId: string; id: string };
  /** The words that raised it (the comment that mentioned the member, the reason given), shown in its detail. */
  quote?: string;
};
export type Invitation = { id: string; email: string; role: Role; invitedById: string; expiresAt: string; status: 'pending' | 'expired' };

const day = (offset: number, hour = 10) => new Date(Date.UTC(2026, 9, 23 - offset, hour - 9, (offset * 7) % 60)).toISOString();

export const PEOPLE: Person[] = [
  { id: 'u1', name: '고재범', kind: 'user', email: 'jaebeom@bit.local', role: 'owner' },
  { id: 'u2', name: '김하늘', kind: 'user', email: 'haneul@bit.local', role: 'admin' },
  { id: 'u3', name: '박서준', kind: 'user', email: 'seojun@bit.local', role: 'member' },
  { id: 'u4', name: '이도윤', kind: 'user', email: 'doyun@bit.local', role: 'viewer' },
  { id: 'a1', name: 'Codex', kind: 'agent' },
  { id: 'a2', name: 'Claude', kind: 'agent' },
];
export const personOf = (id?: string) => PEOPLE.find(person => person.id === id);
/** The member signed in to the demo. */
export const ME = 'u1';

export const WORKSPACES: Workspace[] = [
  { id: 'ws-bit', name: 'BIT 개발', myRole: 'owner', projects: 3, members: 4 },
  { id: 'ws-lab', name: '디자인 랩', myRole: 'member', projects: 1, members: 6 },
];
export const workspaceOf = (id?: string) => WORKSPACES.find(workspace => workspace.id === id);
/** Where /demo opens. */
export const DEFAULT_WORKSPACE = 'ws-bit';

export const PROJECTS: Project[] = [
  { id: 'p-core', workspaceId: 'ws-bit', key: 'BIT', name: 'BIT 코어', status: 'active', leadId: 'u1', updatedAt: day(0) },
  { id: 'p-mcp', workspaceId: 'ws-bit', key: 'MCP', name: 'MCP 연동', status: 'active', leadId: 'u2', updatedAt: day(2) },
  { id: 'p-web', workspaceId: 'ws-bit', key: 'WEB', name: '옛 웹 시안', status: 'archived', leadId: 'u3', updatedAt: day(30) },
  { id: 'p-kit', workspaceId: 'ws-lab', key: 'KIT', name: '디자인 키트', status: 'active', leadId: 'u2', updatedAt: day(5) },
];
export const projectOf = (id?: string) => PROJECTS.find(project => project.id === id);
export const projectsIn = (workspaceId?: string) => PROJECTS.filter(project => project.workspaceId === workspaceId);

export const STATUS_LABELS: Record<Status, string> = { todo: '할 일', doing: '진행 중', review: '검토', done: '완료' };
export const STATUS_COLORS = { todo: 'gray', doing: 'blue', review: 'orange', done: 'green' } as const;
export const PRIORITY_LABELS: Record<Priority, string> = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' };
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const ROLE_LABELS: Record<Role, string> = { owner: '소유자', admin: '관리자', member: '멤버', viewer: '보기 전용' };
export const LABELS = ['서버', '화면', 'MCP', '문서', '배포', '버그'];

const TITLES = [
  '결정 목록 화면의 상태 필터 추가', '세션 일괄 기록 API 문서화', 'MCP get_context 도구 응답 크기 제한', '작업 상세 우측 연결 패널 배치',
  'Docker V4 업그레이드 검증', '링크 순환 검사 성능 개선', '댓글 작성자 스냅샷 표시', '프로젝트 키 변경 후 옛 참조 해석',
  '보드 칸 사이 드래그 위치 보존', '모바일 하단 메뉴 더보기 시트 정리', '활동 이력 페이로드 128KiB 상한 검사', 'API 키 폐기 시 세션 즉시 무효화',
  '산출물 버전 상태 전이 설계', 'Git 웹훅 서명 검증 어댑터', '결정 대체 다이얼로그 버전 충돌 처리', '검색 Inbox 라벨 통합 계획',
  '로그인 화면 입력 크기 정리', 'Litestream 복구 절차 점검', '빈 목록 상태 문구 다듬기', '작업 일괄 보관 동작 추가',
  'SQLite 잠금 대기 시간 조정', '워크스페이스 초대 만료 안내', '프로젝트 진행률 계산 캐시', 'OpenAPI 타입 생성 CI 검사',
  'MCP 도구 목록 응답 정렬', 'MCP 인증 헤더 오류 메시지', '에이전트 세션 요약 가져오기', 'MCP 맥락 묶음 캐시 만료',
];
const STATUSES: Status[] = ['todo', 'doing', 'review', 'done'];
const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export const WORK_ITEMS: WorkItem[] = TITLES.map((title, index) => {
  const projectId = index < 24 ? 'p-core' : 'p-mcp';
  return {
    id: `w${index + 1}`,
    projectId,
    key: projectId === 'p-core' ? `BIT-${120 - index}` : `MCP-${40 - index + 24}`,
    title,
    status: STATUSES[(index * 3 + 1) % 4],
    priority: PRIORITIES[(index * 5 + 2) % 4],
    assigneeId: index % 7 === 6 ? undefined : PEOPLE[index % PEOPLE.length].id,
    labels: [LABELS[index % LABELS.length], ...(index % 3 === 0 ? [LABELS[(index + 2) % LABELS.length]] : [])],
    createdAt: day(index * 2 + 3),
    updatedAt: day(Math.floor(index / 2), 9 + (index % 8)),
    dueAt: index % 4 === 0 ? day(-((index % 9) + 1)) : undefined,
    comments: (index * 7) % 5,
    decisionKey: index % 5 === 1 ? 'D-056' : undefined,
  };
});
export const itemOf = (id?: string) => WORK_ITEMS.find(item => item.id === id);

export const DECISIONS: Decision[] = [
  { id: 'd1', projectId: 'p-core', key: 'D-057', title: '컨트롤 크기는 Astryx 기본과 화면 맥락을 따른다', status: 'accepted', ownerId: 'u1', decidedAt: day(0), progress: [2, 3] },
  { id: 'd2', projectId: 'p-core', key: 'D-056', title: '긴 정정 이력은 필드별 조각으로 나눠 저장한다', status: 'accepted', ownerId: 'a1', decidedAt: day(1), progress: [4, 4] },
  { id: 'd3', projectId: 'p-core', key: 'D-055', title: '세션 일괄 기록은 한 트랜잭션에서 처리한다', status: 'accepted', ownerId: 'u2', decidedAt: day(2), progress: [1, 2] },
  { id: 'd4', projectId: 'p-core', key: 'D-058', title: '데모 페이지를 화면 패턴의 기준으로 삼는다', status: 'proposed', ownerId: 'a2', progress: [0, 0] },
  { id: 'd5', projectId: 'p-core', key: 'D-052', title: '모든 입력을 50px로 키운다', status: 'superseded', ownerId: 'u1', decidedAt: day(6), progress: [3, 3] },
  { id: 'd6', projectId: 'p-mcp', key: 'D-004', title: 'MCP 응답은 128KiB에서 자르고 커서를 준다', status: 'accepted', ownerId: 'u2', decidedAt: day(3), progress: [1, 3] },
];

export const SESSIONS: Session[] = [
  { id: 's1', projectId: 'p-core', key: 'S-014', type: 'meeting', title: 'T-005 설계 회의', occurredAt: day(1, 14), participantIds: ['u1', 'u2', 'u3'], decisions: 3 },
  { id: 's2', projectId: 'p-core', key: 'S-013', type: 'agent_session', title: 'Claude 세션: 링크 순환 검사 구현', occurredAt: day(2, 11), participantIds: ['u1', 'a2'], decisions: 1 },
  { id: 's3', projectId: 'p-core', key: 'S-012', type: 'agent_session', title: 'Codex 세션: 결정 대체 원자성', occurredAt: day(3, 16), participantIds: ['u2', 'a1'], decisions: 2 },
  { id: 's4', projectId: 'p-core', key: 'S-011', type: 'meeting', title: '주간 점검 · UI 레이아웃', occurredAt: day(7, 10), participantIds: ['u1', 'u2', 'u3', 'u4'], decisions: 0 },
  { id: 's5', projectId: 'p-mcp', key: 'S-003', type: 'meeting', title: 'MCP 도구 범위 정리', occurredAt: day(4, 15), participantIds: ['u2', 'u3'], decisions: 1 },
];

export const NOTICES: Notice[] = [
  { id: 'n1', kind: 'mention', title: '고재범님이 댓글에서 언급했습니다', actorId: 'u1', at: day(0, 11), isRead: false,
    target: { type: 'work_item', key: 'BIT-118', title: 'MCP get_context 도구 응답 크기 제한', projectId: 'p-core', id: 'w3' },
    quote: '@김하늘 응답을 자를 때 커서도 같이 내려주면 에이전트가 이어서 읽을 수 있을 것 같아요. 128KiB 기준이면 충분할까요?' },
  { id: 'n2', kind: 'assigned', title: 'Codex가 작업을 배정했습니다', actorId: 'a1', at: day(0, 9), isRead: false,
    target: { type: 'work_item', key: 'BIT-116', title: 'Docker V4 업그레이드 검증', projectId: 'p-core', id: 'w5' },
    quote: '세션 S-013에서 도출된 후속 작업입니다. 동일 볼륨 재생성 후 데이터 보존을 확인해 주세요.' },
  { id: 'n3', kind: 'decision', title: '결정이 확정되었습니다', actorId: 'u1', at: day(1, 15), isRead: false,
    target: { type: 'decision', key: 'D-057', title: '컨트롤 크기는 Astryx 기본과 화면 맥락을 따른다', projectId: 'p-core', id: 'd1' } },
  { id: 'n4', kind: 'review', title: '검토 요청이 왔습니다', actorId: 'u3', at: day(1, 10), isRead: true,
    target: { type: 'work_item', key: 'BIT-113', title: '프로젝트 키 변경 후 옛 참조 해석', projectId: 'p-core', id: 'w8' },
    quote: '옛 키 BIT-OLD로 들어오는 링크도 같은 UUID로 풀리는지 봐 주세요.' },
  { id: 'n5', kind: 'mention', title: 'Claude가 세션 요약에서 언급했습니다', actorId: 'a2', at: day(2, 14), isRead: true,
    target: { type: 'session', key: 'S-014', title: 'T-005 설계 회의', projectId: 'p-core', id: 's1' },
    quote: '고재범님이 결정 대체는 같은 프로젝트의 확정 결정만 허용하자고 정리했습니다.' },
  { id: 'n6', kind: 'assigned', title: '김하늘님이 작업을 배정했습니다', actorId: 'u2', at: day(4, 16), isRead: true,
    target: { type: 'work_item', key: 'BIT-111', title: '모바일 하단 메뉴 더보기 시트 정리', projectId: 'p-core', id: 'w10' } },
  { id: 'n7', kind: 'decision', title: '결정이 대체되었습니다', actorId: 'u1', at: day(6, 13), isRead: true,
    target: { type: 'decision', key: 'D-052', title: '모든 입력을 50px로 키운다', projectId: 'p-core', id: 'd5' } },
];

export const INVITATIONS: Invitation[] = [
  { id: 'i1', email: 'minji@bit.local', role: 'member', invitedById: 'u1', expiresAt: day(-5), status: 'pending' },
  { id: 'i2', email: 'design@partner.example', role: 'viewer', invitedById: 'u2', expiresAt: day(2), status: 'expired' },
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
