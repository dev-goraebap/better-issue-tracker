import type { ReactNode } from 'react';
import { Heading, HStack, Text, VStack } from '@astryxdesign/core';
import { PRODUCT_NAME } from '@/shared/config';
import { ProductMark } from './ProductMark';
import styles from './auth.module.css';
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className={styles.frame}><VStack gap={6} padding={6}>
    <HStack gap={3}><ProductMark /><Text type="label">{PRODUCT_NAME} · 계정</Text></HStack><Heading level={1}>{title}</Heading>{children}
  </VStack></main>;
}
