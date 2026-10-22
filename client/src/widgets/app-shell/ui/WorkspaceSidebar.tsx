import { SideNav, SideNavHeading, SideNavItem, SideNavSection, Text, VStack } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { PRODUCT_NAME, WORKSPACE_NAVIGATION } from '@/shared/config';
import { NavIcon } from '@/shared/ui';

export function WorkspaceSidebar({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  return <SideNav aria-label="워크스페이스 메뉴" collapsible
    header={<SideNavHeading heading={PRODUCT_NAME} subheading="워크스페이스" />}
    footer={<VStack padding={4}><Text type="supporting">함께 일한 맥락을 한곳에</Text></VStack>}>
    <SideNavSection title="워크스페이스" isHeaderHidden>
      {WORKSPACE_NAVIGATION.map(item => <SideNavItem key={item.path} label={item.label}
        href={item.path} icon={<NavIcon name={item.icon} />} isSelected={pathname === item.path}
        onClick={event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          void navigate({ to: item.path });
        }} />)}
    </SideNavSection>
    <SideNavSection title="프로젝트">
      <VStack padding={4}><Text type="supporting">아직 프로젝트가 없습니다.</Text></VStack>
    </SideNavSection>
  </SideNav>;
}
