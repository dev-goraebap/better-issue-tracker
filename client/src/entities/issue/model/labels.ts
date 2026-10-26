import type { Issue } from '../api/issue';
export const PRIORITIES: Record<NonNullable<Issue['priority']>, string> = { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' };
