import { Button } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { PageFrame, PageState } from '@/shared/ui';

/** An address that names no page: the not-found state with the way home. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return <PageFrame title="페이지를 찾을 수 없습니다">
    <PageState kind="not-found" title="페이지를 찾을 수 없습니다" description="주소가 바뀌었거나 없는 페이지입니다. 홈에서 다시 찾아 주세요."
      actions={<Button label="홈으로" variant="secondary" onClick={() => void navigate({ to: '/' })} />} />
  </PageFrame>;
}
