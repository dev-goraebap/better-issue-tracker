import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Heading, HStack, VStack } from '@astryxdesign/core';
import { PageChromeContext } from './page-chrome';
import styles from './page.module.css';
export function PageFrame({ title, children, actions, tools, tabs, conditions, width = 'default' }: { title: string; children: ReactNode; actions?: ReactNode; tools?: ReactNode; tabs?: ReactNode; conditions?: ReactNode; width?: 'default' | 'narrow' | 'full' }) {
  const chrome = useContext(PageChromeContext);
  const rows = <>{tabs && <HStack gap={4} wrap="wrap" className={styles.toolbar} data-action-row>{tabs}{tools && <section className={styles.rowEnd}>{tools}</section>}</HStack>}{conditions && <HStack gap={3} wrap="wrap" className={styles.conditions} data-action-row>{conditions}</HStack>}</>;
  return <>
    {chrome?.actions && actions && createPortal(actions, chrome.actions)}
    {chrome?.tools && !tabs && tools && createPortal(tools, chrome.tools)}
    {chrome?.rows && createPortal(rows, chrome.rows)}
    <VStack gap={6} className={`${styles.page} ${styles[width]}`}>
      <Heading level={1} className={chrome ? styles.srOnly : undefined}>{title}</Heading>
      {!chrome && <><HStack gap={3}>{actions}{!tabs && tools}</HStack>{rows}</>}
      {children}
    </VStack>
  </>;
}
