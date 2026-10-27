import type { Notice } from '../api/notification';
const kinds: Record<Notice['type'], { label: string; icon: string }> = {
  assigned: { label: '담당자 지정', icon: 'person' }, invited: { label: '참석 초대', icon: 'people' },
  commented: { label: '새 댓글', icon: 'comment' }, rescheduled: { label: '일정 변경', icon: 'calendar' },
  due_today: { label: '오늘의 기한', icon: 'clock' }, event_reminder: { label: '일정 리마인더', icon: 'bell' },
};
export const notificationKind = (type: Notice['type']) => kinds[type];
