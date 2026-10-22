import type { ReactNode } from 'react';
import { Heading, Text, VStack } from '@astryxdesign/core';
import { PRODUCT_NAME } from '@/shared/config';
import styles from './auth.module.css';
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className={styles.frame}><VStack gap={6} padding={6}>
    <Text type="label">{PRODUCT_NAME} · 계정</Text><Heading level={1}>{title}</Heading>{children}
  </VStack></main>;
}
