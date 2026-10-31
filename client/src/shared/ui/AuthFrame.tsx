import type { ReactNode } from 'react';
import { Heading, HStack, VStack } from '@astryxdesign/core';
import { PRODUCT_NAME } from '@/shared/config';
import { ProductMark } from './ProductMark';
import styles from './auth.module.css';
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className={styles.frame} aria-label={`${PRODUCT_NAME} ${title}`}><VStack gap={6} padding={6}>
    <HStack as="header" gap={3} vAlign="center"><ProductMark /><Heading level={1} className={styles.title}>{title}</Heading></HStack>{children}
  </VStack></main>;
}
