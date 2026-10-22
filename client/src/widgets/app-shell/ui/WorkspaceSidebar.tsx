import { SideNav, SideNavItem, SideNavSection, Text, VStack } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { WORKSPACE_NAVIGATION } from '@/shared/config';
import { NavIcon } from '@/shared/ui';
import { AccountMenu } from '@/features/account-menu';
import type { Space } from '@/entities/workspace';
import { SidebarHeading } from './SidebarHeading';
import styles from './app-shell.module.css';
export function WorkspaceSidebar({ pathname, workspace, folded, onFold }: { pathname: string; workspace?: Space; folded: boolean; onFold: (next: boolean) => void }) {
  const navigate = useNavigate();
  const prefix = workspace ? `/w/${workspace.id}` : '';
  return <SideNav aria-label="워크스페이스 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }}
    resizable={{ defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-sidebar', isCollapsed: folded, onCollapseChange: onFold }}
    header={<SidebarHeading folded={folded} name={workspace?.name ?? '내 계정'} />}
    topContent={<AccountMenu compact folded={folded} />} footer={!folded && <Text type="supporting">v0.0.0</Text>}>
    <SideNavSection title="워크스페이스" isHeaderHidden>
      <SideNavItem icon={<NavIcon name="switcher" />} label="공간 선택 · 전환" href="/workspaces" isSelected={pathname === '/workspaces'} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate({ to: '/workspaces' }); }} />
      {workspace && WORKSPACE_NAVIGATION.map(item => { const href = prefix + (item.path === '/' ? '' : item.path); return <SideNavItem key={item.path} label={item.label} href={href} icon={<NavIcon name={item.icon} />} isSelected={pathname.replace(/\/$/, '') === href}
        onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate({ href }); }} />; })}
      {workspace && <SideNavItem icon={<NavIcon name="settings" />} label="워크스페이스 설정" href={`${prefix}/settings`} isSelected={pathname.endsWith('/settings')} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate({ to: '/w/$workspaceId/settings', params: { workspaceId: workspace.id } }); }} />}
    </SideNavSection>
    {workspace && !folded && <SideNavSection title="프로젝트"><VStack padding={4}><Text type="supporting">아직 프로젝트가 없습니다.</Text></VStack></SideNavSection>}
  </SideNav>;
}
