import { Text, VStack } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { projectsQuery } from '@/entities/project';
import { emptyTaskSearch } from '@/features/work-item-filters';
import { PageFrame, QueryMessage, SectionHeader } from '@/shared/ui';
export function HomePage() {
  const { workspaceId = '' } = useParams({ strict: false }); const result = useInfiniteQuery(projectsQuery(workspaceId));
  const items = result.error ? [] : result.data?.pages[0]?.items.slice(0, 6) ?? [];
  return <PageFrame title="홈"><SectionHeader title="프로젝트" /><Link to="/w/$workspaceId/projects" params={{ workspaceId }} search={{ status: 'active', q: '' }}>모든 프로젝트 보기</Link>
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
    {!result.isPending && !result.error && !items.length && <Text color="secondary">프로젝트를 만들면 이곳에서 작업을 시작할 수 있습니다.</Text>}
    <VStack gap={4}>{items.map(item => <Link key={item.id} to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: item.id }} search={{ ...emptyTaskSearch(), view: 'board' }}>{item.key} · {item.name}</Link>)}</VStack>
  </PageFrame>;
}
