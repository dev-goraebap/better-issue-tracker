import type { WorkItem } from '../api/work-item';
export const PRIORITIES: Record<NonNullable<WorkItem['priority']>, string> = { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' };
