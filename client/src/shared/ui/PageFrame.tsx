import type { ReactNode } from 'react';
import { Heading, VStack } from '@astryxdesign/core';

export function PageFrame({ title, children }: { title: string; children: ReactNode }) {
  return <VStack gap={6} padding={6}>
    <Heading level={1}>{title}</Heading>
    {children}
  </VStack>;
}
