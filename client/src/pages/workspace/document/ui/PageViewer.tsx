import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Ref } from 'react';
import { isNotFound } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { NavIcon, PageState, RequestBoundary } from '@/shared/ui';
import { pageVersionQuery } from '../api/page-version';
import styles from './page-viewer.module.css';

/** The upload owns the canvas; opening conversation leaves its isolated frame mounted. */
export function PageViewer({ workspaceId, documentId, documentRef, title, number, frameRef }: {
  workspaceId: string; documentId: string; documentRef: string; title: string; number: number;
  frameRef: Ref<HTMLIFrameElement>;
}) {
  const navigate = useNavigate();
  const result = useQuery(pageVersionQuery(workspaceId, documentId, number));
  const version = result.data;
  // Start the bridge revision at a fresh URL even when the browser cached an older response without BIT's helper.
  const frameUrl = version ? new URL(version.viewUrl, window.location.href) : undefined;
  frameUrl?.searchParams.set('bit-view', '1');
  if (!version && isNotFound(result.error)) return <PageState kind="not-found" title={`v${number} 버전이 없습니다`}
    description="주소의 버전이 이 페이지에 없습니다. 최신 버전을 보세요."
    actions={<Button label="최신 버전 보기" variant="secondary"
      onClick={() => void navigate({ to: '/workspaces/$workspaceId/documents/$documentRef', params: { workspaceId, documentRef }, search: {} })} />} />;
  return <section className={styles.viewer} aria-label="페이지 내용">
    <div className={styles.stage}>
      <RequestBoundary pending={result.isPending} hasData={!!version} error={result.error} retry={() => { void result.refetch(); }}>
        {version && <iframe ref={frameRef} key={version.viewUrl} className={styles.frame} src={frameUrl?.href} title={`${title} v${number}`}
          sandbox="allow-scripts allow-modals" referrerPolicy="no-referrer" />}
      </RequestBoundary>
    </div>
    <div className={styles.caption}>
      <span className={styles.notice} title="올린 사람이 만든 내용입니다. 비밀번호나 개인 정보를 묻더라도 입력하지 마세요."><NavIcon name="shield" />업로드된 페이지</span>
      {version && <span className={styles.made} title={version.version.note ?? undefined}>v{number}{version.version.note ? ` · ${version.version.note}` : ''} · {dateText(version.version.createdAt)}</span>}
    </div>
  </section>;
}
