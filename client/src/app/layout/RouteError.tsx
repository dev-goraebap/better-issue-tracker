import { Heading, Text, VStack, Button } from '@astryxdesign/core';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { authError } from '@/shared/api';
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return <main><VStack gap={4} padding={6}><Heading level={1}>화면을 불러오지 못했습니다</Heading><Text>{authError(error)}</Text><Button label="다시 시도" onClick={() => { void router.invalidate().then(reset); }} /></VStack></main>;
}
