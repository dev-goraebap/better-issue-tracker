import type { ReactNode } from 'react';
import { AppShell, Text } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY, PRODUCT_NAME } from '@/shared/config';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { MobileNavigation } from './MobileNavigation';
import styles from './app-shell.module.css';

export function WorkspaceShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return <section className={styles.shell} aria-label={PRODUCT_NAME}>
    <AppShell mobileNav={false} sideNav={isMobile ? undefined : <WorkspaceSidebar pathname={pathname} />}
      topNav={isMobile ? <header className={styles.mobileHeader}><Text weight="semibold">{PRODUCT_NAME}</Text></header> : undefined}
      variant="elevated">
      {children}
    </AppShell>
    {isMobile && <MobileNavigation pathname={pathname} />}
  </section>;
}
