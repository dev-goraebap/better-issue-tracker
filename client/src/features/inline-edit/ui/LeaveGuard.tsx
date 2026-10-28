import { useBlocker } from '@tanstack/react-router';
import { ConfirmDialog } from '@/shared/ui';

/**
 * Asks before the member leaves unsaved words (D-107): going to another page in the app asks here, closing or reloading
 * the tab asks through the browser's own question.
 */
export function LeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker({ shouldBlockFn: () => when, enableBeforeUnload: () => when, withResolver: true });
  if (blocker.status !== 'blocked') return null;
  return <ConfirmDialog title="저장하지 않고 나갈까요?" description="고친 제목과 본문이 사라집니다." confirmLabel="저장하지 않고 나가기" variant="destructive"
    onClose={() => blocker.reset()} onConfirm={() => blocker.proceed()} />;
}
