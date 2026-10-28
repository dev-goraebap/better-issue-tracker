import { Button } from '@astryxdesign/core';
import { CompactDialog } from '@/shared/ui';
import type { Scope } from '../model/use-inline-edit';
import styles from './inline-edit.module.css';

/**
 * What saving may have to ask (D-107): for a repeating work item, which occurrences the words are for; and when someone
 * changed the title or body since the member started, whose words to keep.
 */
export function SaveQuestions({ isAskingScope, hasConflict, isBusy, onScope, onCancelScope, onTakeLatest, onKeepMine }: {
  isAskingScope: boolean; hasConflict: boolean; isBusy: boolean;
  onScope: (scope: Scope) => void; onCancelScope: () => void; onTakeLatest: () => void; onKeepMine: () => void;
}) {
  if (isAskingScope) return <CompactDialog title="반복 업무 고치기" width={520} onClose={onCancelScope} footer={<>
    <Button label="취소" variant="ghost" onClick={onCancelScope} />
    <Button label="이 회차만" variant="secondary" onClick={() => onScope('single')} />
    <Button label="이후 모두" variant="primary" onClick={() => onScope('following')} />
  </>}>
    <p className={styles.question}>이 회차만 고칠까요, 이후 회차도 함께 고칠까요? 이후 모두를 고르면 설명은 다음에 만들어질 회차부터 바뀝니다.</p>
  </CompactDialog>;
  if (hasConflict) return <CompactDialog title="다른 사람이 먼저 고쳤습니다" width={520} isBusy={isBusy} onClose={onTakeLatest} footer={<>
    <Button label="최신 내용 보기" variant="secondary" onClick={onTakeLatest} isDisabled={isBusy} />
    <Button label="내 내용으로 덮기" variant="primary" onClick={onKeepMine} isLoading={isBusy} />
  </>}>
    <p className={styles.question}>고치는 사이 다른 사람이나 에이전트가 제목이나 본문을 바꿨습니다. 최신 내용을 보면 내가 고친 것은 사라지고, 내 내용으로 덮으면 그 사람이 고친 것이 사라집니다.</p>
  </CompactDialog>;
  return null;
}
