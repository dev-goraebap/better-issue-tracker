import { PageFrame, PageState } from '@/shared/ui';

/**
 * 알림, /workspaces/$workspaceId/inbox (the bell at the menu's head, D-059). Notices are not made yet (T-006 leaves them out), so it
 * says what will arrive here.
 */
export function InboxPage() {
  return <PageFrame title="알림" icon="bell" chrome="header">
    <PageState title="새 알림이 없습니다" description="나를 담당자로 지정하거나, 내 업무의 상태가 바뀌면 여기에 모입니다." />
  </PageFrame>;
}
