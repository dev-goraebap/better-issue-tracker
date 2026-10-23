import type { WorkItem } from '../api/work-item';
export const PRIORITIES: Record<NonNullable<WorkItem['priority']>, string> = { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' };
export const TRIGGERS: Record<NonNullable<WorkItem['triggerType']>, string> = { request: '요구', finding: '발견', external: '외부 변화', improvement: '개선', planned: '계획' };
