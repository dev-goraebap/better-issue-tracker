import { useState, type ReactNode } from 'react';
import { Button, Text, VStack } from '@astryxdesign/core';
import { isNotFound } from '@/shared/api';
import { usePageBackAction } from './BackLink';
import { InlineLoader } from './page-loading';
import { PageState, pickVariant } from './page-state';
import { useLoadingHold } from './use-loading-hold';
import styles from './page.module.css';

/**
 * A screen part's own read, as SandboxHr's: the small rocket while it has nothing to show (past 100ms, for 300ms at
 * least), a failure with a retry, or its content fading in. A read the server answers with 404, or one that came back
 * without the item the screen names (`missing`), is the not-found state with no retry, since asking again finds nothing
 * either; its action is the page's way back (the PageFrame's back link) as a button. Content already shown stays when a
 * later read fails, with a note and a retry over it.
 */
export function RequestBoundary({ pending, hasData, error, missing = false, retry, children }: {
  pending: boolean; hasData: boolean; error: unknown; missing?: boolean; retry: () => void; children: ReactNode;
}) {
  const loading = useLoadingHold(pending && !hasData && !error && !missing, { delay: 100, minimum: 300 });
  const back = usePageBackAction();
  // A retry shows the loader in its place, so the failure's drawing is picked here, where it outlives the retry.
  const [variant] = useState(pickVariant);
  if (missing || isNotFound(error)) return <PageState kind="not-found" title="찾는 내용이 없습니다"
    description="지워졌거나 주소가 잘못되었을 수 있습니다. 목록으로 돌아가 다시 찾아 주세요." actions={back} />;
  if (!hasData && error) return <div role="alert" className={styles.requestError}>
    <PageState kind="error" variant={variant} title="정보를 불러오지 못했습니다" description="연결 상태를 확인하고 다시 시도해 주세요."
      actions={<Button label="다시 시도" variant="secondary" onClick={retry} />} />
  </div>;
  if (!hasData || loading) return loading ? <InlineLoader label="화면 정보를 불러오는 중" /> : <div className={styles.waiting} aria-busy="true" aria-label="화면 정보를 불러오는 중" />;
  return <div className={styles.reveal}>
    {!!error && <VStack gap={2} role="alert"><Text>새 정보를 가져오지 못해 이전 내용을 표시합니다.</Text><Button label="다시 시도" variant="secondary" onClick={retry} /></VStack>}
    {children}
  </div>;
}
