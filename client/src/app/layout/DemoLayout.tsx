import { useState, type MouseEvent } from 'react';
import { SideNav, SideNavItem, SideNavSection, Text } from '@astryxdesign/core';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ShellFrame, ShellTabBar, Trail, type TrailStep } from '@/widgets/app-shell';
import { PRODUCT_NAME } from '@/shared/config';
import { DefaultAvatar, NavIcon, ProductMark } from '@/shared/ui';
import { DEMO_NAVIGATION, demoEntryOf, WORK_ITEMS } from '@/entities/demo-sample';
import styles from './demo-layout.module.css';

/**
 * The demo's frame: the same ShellFrame the workspace draws, with the demo's own menu (one entry per screen pattern),
 * trail and phone tab bar. It reads nothing from the server, so it opens without signing in; the account box is a
 * stand-in.
 */
export function DemoLayout() {
  const pathname = useRouterState({ select: state => (state.resolvedLocation ?? state.location).pathname });
  const navigate = useNavigate();
  const [folded, setFolded] = useState(false);
  const entry = demoEntryOf(pathname);
  const go = (href: string) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); void navigate({ href });
  };
  // A work item's page sits under the table: the trail is Demo › 작업 표 › its key.
  const item = /^\/demo\/items\/(w\d+)$/.exec(pathname)?.[1];
  const steps: TrailStep[] = [{ label: 'Demo', href: '/demo', onClick: go('/demo') }];
  if (item) steps.push({ label: '작업 표', href: '/demo/table', onClick: go('/demo/table') }, { label: WORK_ITEMS.find(each => each.id === item)?.key ?? '작업' });
  else steps.push({ label: entry?.label ?? '페이지 찾기' });
  const groups = [...new Set(DEMO_NAVIGATION.map(each => each.group))];
  const sidebar = <SideNav aria-label="데모 메뉴" className={styles.sidebar} collapsible={{ hasButton: false }}
    resizable={{ defaultWidth: 250, minWidth: 236, maxWidth: 350, autoSaveId: 'bit-demo-sidebar', isCollapsed: folded, onCollapseChange: setFolded }}
    header={<header className={styles.heading} data-folded={folded || undefined}>
      <Link to="/demo" className={styles.brand} aria-label={`${PRODUCT_NAME} 데모 처음으로`}><ProductMark /></Link>
      {!folded && <><i className={styles.rule} aria-hidden="true" /><span className={styles.space}>UI Demo</span></>}
    </header>}
    topContent={folded ? <div className={styles.accountFolded}><DefaultAvatar seed="demo" name="데모 사용자" /></div>
      : <div className={styles.account}><DefaultAvatar seed="demo" name="데모 사용자" /><span className={styles.accountText}><Text weight="semibold" maxLines={1}>데모 사용자</Text><Text type="supporting" color="secondary" maxLines={1}>demo@bit.local</Text></span></div>}
    footer={!folded && <Text type="supporting" color="secondary">목데이터 · 서버 없음</Text>}>
    {groups.map(group => <SideNavSection key={group || 'main'} title={group || '주요 메뉴'} isHeaderHidden={!group}>
      {DEMO_NAVIGATION.filter(each => each.group === group).map(each => <SideNavItem key={each.path} label={each.label} href={each.path} icon={<NavIcon name={each.icon} />}
        isSelected={entry?.path === each.path} onClick={go(each.path)}
        endContent={each.path === '/demo/inbox' ? <span className={styles.newsDot} role="img" aria-label="확인할 것 있음" /> : undefined} />)}
    </SideNavSection>)}
  </SideNav>;
  const tab = (each: (typeof DEMO_NAVIGATION)[number]) => ({ label: each.label, icon: each.icon, href: each.path, isCurrent: entry?.path === each.path });
  return <ShellFrame pathname={pathname} folded={folded} onFold={setFolded} trail={<Trail steps={steps} />} sidebar={sidebar}
    mobileNav={<ShellTabBar label="데모 메뉴" moreTitle="UI Demo · 목데이터" tabs={DEMO_NAVIGATION.filter(each => each.isMobileTab).map(tab)} more={DEMO_NAVIGATION.filter(each => !each.isMobileTab).map(tab)} />}>
    <Outlet />
  </ShellFrame>;
}
