import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { InlineLoader } from './page-loading';
import { PageState, pickVariant } from './page-state';
import { useLoadingHold } from './use-loading-hold';
import styles from './page.module.css';

/**
 * A read's state in the place its content will take, for a part that draws the content itself once it has it: the small
 * rocket while it waits (past 100ms, for 300ms at least, as RequestBoundary), a failure with a retry, or nothing. Prefer
 * RequestBoundary when the content can be its children.
 */
export function QueryMessage({ pending, error, retry }: { pending?: boolean; error?: unknown; retry: () => void }) {
  const loading = useLoadingHold(!!pending && !error, { delay: 100, minimum: 300 });
  const [variant] = useState(pickVariant);
  if (error) return <div role="alert" className={styles.requestError}>
    <PageState kind="error" variant={variant} title="정보를 불러오지 못했습니다" description="연결 상태를 확인하고 다시 시도해 주세요."
      actions={<Button label="다시 시도" variant="secondary" onClick={retry} />} />
  </div>;
  if (loading) return <InlineLoader label="화면 정보를 불러오는 중" />;
  return pending ? <div className={styles.waiting} aria-busy="true" aria-label="화면 정보를 불러오는 중" /> : null;
}
