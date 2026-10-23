import { Button } from '@astryxdesign/core';
import { PageFrame, PageState } from '@/shared/ui';

/**
 * PATTERN · 준비 중인 기능, /demo/w/$workspaceId/documents. The workspace's 문서함 (D-015, T-006) keeps its menu and says
 * what it will hold, its action shown but unavailable until the feature is on.
 */
export function DemoDocumentsPage() {
  return <PageFrame title="문서함" icon="documents" chrome="header">
    <PageState title="문서함은 준비 중입니다" description="폴더 트리로 산출물을 모으고 프로젝트 라벨로 거르는 공간입니다. 파일 저장소가 켜지면 여기서 문서를 올리고 옮길 수 있습니다."
      actions={<Button label="폴더 만들기" variant="secondary" isDisabled />} />
  </PageFrame>;
}
