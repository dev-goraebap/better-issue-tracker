import { Link } from '@tanstack/react-router';
import { Text } from '@astryxdesign/core';
import { PageFrame } from '@/shared/ui';

export function NotFoundPage() {
  return <PageFrame title="페이지를 찾을 수 없습니다">
    <Text color="secondary">주소를 확인하거나 홈으로 이동해 주세요.</Text>
    <Link to="/">홈으로</Link>
  </PageFrame>;
}
