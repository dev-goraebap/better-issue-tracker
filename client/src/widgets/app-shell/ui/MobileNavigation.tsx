import { useState } from 'react';
import { BottomSheet, Heading, Text, VStack } from '@astryxdesign/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { MOBILE_TAB_PATHS, PRODUCT_NAME, WORKSPACE_NAVIGATION } from '@/shared/config';
import { NavIcon } from '@/shared/ui';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { AccountMenu } from '@/features/account-menu';
import type { Space } from '@/entities/workspace';
import styles from './app-shell.module.css';
export function MobileNavigation({ pathname, workspace }: { pathname: string; workspace?: Space }) {
  const [isMoreOpen, setMoreOpen] = useState(false); const navigate = useNavigate();
  const prefix = workspace ? `/w/${workspace.id}` : '';
  const tabs = workspace ? WORKSPACE_NAVIGATION.filter(item => MOBILE_TAB_PATHS.includes(item.path)) : [];
  const remaining = workspace ? WORKSPACE_NAVIGATION.filter(item => !MOBILE_TAB_PATHS.includes(item.path)) : [];
  const href = (path: string) => prefix + (path === '/' ? '' : path);
  return <>
    <nav className={styles.mobileNavigation} aria-label="워크스페이스 메뉴">
      {tabs.map(item => <a key={item.path} href={href(item.path)} className={styles.tab} aria-current={pathname.replace(/\/$/, '') === href(item.path) ? 'page' : undefined} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void navigate({ href: href(item.path) }); }}><NavIcon name={item.icon} /><Text type="supporting" color="inherit">{item.label}</Text></a>)}
      {!workspace && <Link to="/workspaces" className={styles.tab}><NavIcon name="home" /><Text type="supporting">공간 선택</Text></Link>}
      <button type="button" className={styles.tab} onClick={() => setMoreOpen(true)} aria-expanded={isMoreOpen} aria-haspopup="dialog"><NavIcon name="more" /><Text type="supporting" color="inherit">더보기</Text></button>
    </nav>
    <BottomSheet isOpen={isMoreOpen} onOpenChange={setMoreOpen} label="더보기" height="hug"><VStack gap={4} padding={6}>
      <Heading level={2}>더보기</Heading><Text type="supporting">{PRODUCT_NAME} · {workspace?.name ?? '내 계정'}</Text>
      <nav className={styles.moreNavigation} aria-label="추가 메뉴">
        {[...remaining.map(item => ({ label: item.label, path: href(item.path) })), ...(workspace ? [{ label: '워크스페이스 설정', path: `${prefix}/settings` }] : []), { label: '공간 선택 · 전환', path: '/workspaces' }].map(item => <a key={item.path} href={item.path} className={styles.moreLink} aria-current={pathname === item.path ? 'page' : undefined} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setMoreOpen(false); afterOverlayClose(() => { void navigate({ href: item.path }); }); }}><Text>{item.label}</Text></a>)}
      </nav><AccountMenu onNavigate={path => { setMoreOpen(false); afterOverlayClose(() => { void navigate({ to: path }); }); }} />
    </VStack></BottomSheet>
  </>;
}
