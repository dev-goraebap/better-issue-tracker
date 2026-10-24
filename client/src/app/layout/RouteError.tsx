import { Button } from '@astryxdesign/core';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { PageState } from '@/shared/ui';

/** A screen whose route failed to load: the error state, what went wrong in plain words, and 다시 시도. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return <main role="alert">
    <PageState kind="error" title="화면을 불러오지 못했습니다" description={authError(error)}
      actions={<Button label="다시 시도" variant="secondary" onClick={() => { void router.invalidate().then(reset); }} />} />
  </main>;
}
