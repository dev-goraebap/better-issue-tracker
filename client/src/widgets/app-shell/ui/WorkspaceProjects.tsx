import { SideNavItem, SideNavSection, Text, VStack } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { projectsQuery } from '@/entities/project';
import { NavIcon, QueryMessage } from '@/shared/ui';
export function WorkspaceProjects({ workspaceId, pathname }: { workspaceId: string; pathname: string }) {
  const result = useInfiniteQuery(projectsQuery(workspaceId)); const navigate = useNavigate();
  const items = result.error ? [] : result.data?.pages.flatMap(page => page.items) ?? [];
  const links = [{ id: 'all', name: '모든 프로젝트', href: `/w/${workspaceId}/projects` }, ...items.map(item => ({ id: item.id, name: item.name, href: `/w/${workspaceId}/p/${item.id}` }))];
  return <SideNavSection title="프로젝트">
    {links.map(item => <SideNavItem key={item.id} label={item.name} href={item.href} icon={<NavIcon name="documents" />} isSelected={pathname === item.href || pathname.startsWith(item.href + '/')} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate({ href: item.href }); }} />)}
    <VStack padding={4}><QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />{!result.isPending && !result.error && !items.length && <Text type="supporting">아직 프로젝트가 없습니다.</Text>}{result.hasNextPage && <Text type="supporting">모든 프로젝트에서 나머지를 볼 수 있습니다.</Text>}</VStack>
  </SideNavSection>;
}
