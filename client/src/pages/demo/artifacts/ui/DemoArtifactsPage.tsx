import { Button } from '@astryxdesign/core';
import { PageFrame, PageState } from '@/shared/ui';

/**
 * PATTERN · 준비 중인 기능, /demo/w/$workspaceId/p/$projectId/artifacts. A menu whose feature is not built yet (T-006) keeps
 * its place and says what will be here and what to do meanwhile, with its action shown but unavailable; it is never a
 * blank page or a hidden menu.
 */
export function DemoArtifactsPage() {
  return <PageFrame title="산출물" icon="documents" chrome="header">
    <PageState title="산출물은 준비 중입니다" description="이 프로젝트 라벨이 붙은 문서와 파일이 정본·파생본과 함께 여기에 모입니다. 지금은 작업의 첨부로 남겨 주세요."
      actions={<Button label="산출물 등록" variant="secondary" isDisabled />} />
  </PageFrame>;
}
