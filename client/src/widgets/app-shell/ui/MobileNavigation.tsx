import { useState } from 'react';
import { BottomSheet, Heading, Text, VStack } from '@astryxdesign/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { MOBILE_TAB_PATHS, PRODUCT_NAME, WORKSPACE_NAVIGATION } from '@/shared/config';
import { NavIcon } from '@/shared/ui';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { AccountMenu } from '@/features/account-menu';
import styles from './app-shell.module.css';

export function MobileNavigation({ pathname }: { pathname: string }) {
  const [isMoreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const tabs = WORKSPACE_NAVIGATION.filter(item => MOBILE_TAB_PATHS.includes(item.path));
  const remaining = WORKSPACE_NAVIGATION.filter(item => !MOBILE_TAB_PATHS.includes(item.path));
  return <>
    <nav className={styles.mobileNavigation} aria-label="워크스페이스 메뉴">
      {tabs.map(item => <Link key={item.path} to={item.path} className={styles.tab}
        aria-current={pathname === item.path ? 'page' : undefined}>
        <NavIcon name={item.icon} /><Text type="supporting" color="inherit">{item.label}</Text>
      </Link>)}
      <button type="button" className={styles.tab} onClick={() => setMoreOpen(true)}
        aria-expanded={isMoreOpen} aria-haspopup="dialog"
        aria-current={remaining.some(item => item.path === pathname) ? 'page' : undefined}>
        <NavIcon name="more" /><Text type="supporting" color="inherit">더보기</Text>
      </button>
    </nav>
    <BottomSheet isOpen={isMoreOpen} onOpenChange={setMoreOpen} label="더보기" height="hug">
      <VStack gap={4} padding={6}>
        <Heading level={2}>더보기</Heading>
        <Text type="supporting">{PRODUCT_NAME} · 워크스페이스</Text>
        <nav className={styles.moreNavigation} aria-label="추가 메뉴">
          {remaining.map(item => <Link key={item.path} to={item.path} className={styles.moreLink}
            aria-current={pathname === item.path ? 'page' : undefined} onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setMoreOpen(false);
              afterOverlayClose(() => { void navigate({ to: item.path }); });
            }}>
            <NavIcon name={item.icon} /><Text>{item.label}</Text>
          </Link>)}
        </nav>
        <Text type="label">프로젝트</Text>
        <Text type="supporting">아직 프로젝트가 없습니다.</Text>
        <AccountMenu onNavigate={path => {
          setMoreOpen(false);
          afterOverlayClose(() => { void navigate({ to: path }); });
        }} />
      </VStack>
    </BottomSheet>
  </>;
}
