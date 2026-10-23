import { Button, Text, VStack } from '@astryxdesign/core';
import { authError } from '@/shared/api';
export function QueryMessage({ pending, error, retry }: { pending?: boolean; error?: unknown; retry: () => void }) {
  if (error) return <VStack gap={3}><section role="alert"><Text>{authError(error)}</Text></section><Button label="다시 불러오기" onClick={retry} /></VStack>;
  return pending ? <section role="status" aria-live="polite"><Text color="secondary">불러오는 중…</Text></section> : null;
}
