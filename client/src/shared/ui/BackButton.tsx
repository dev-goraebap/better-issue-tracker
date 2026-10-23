import { Button } from '@astryxdesign/core';
import { useRouter, type LinkProps } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { hasPrevious, isPlainClick } from '@/shared/lib/history-trail';
import { NavIcon } from './NavIcon';

/**
 * Where a page's way back goes: to the screen before, through history, wherever the member came from (a list keeps
 * the slices and the place they left, a notice or the calendar is returned to). Only when nothing of this app is known
 * before (a link opened afresh, a reload) does it move to `link`, the page's own list.
 */
function useWayBack(link: LinkProps) {
  const router = useRouter();
  const href = router.buildLocation(link as Parameters<typeof router.buildLocation>[0]).href;
  const goBack = (event: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (hasPrevious()) router.history.back();
    else void router.navigate(link as Parameters<typeof router.navigate>[0]);
  };
  return { href, goBack };
}

/**
 * A page's way back as a button, going back through history (useWayBack): '이전으로 돌아가기' as a state's main action, or
 * a quieter one (label, variant) at the start of a phone's foot row.
 */
export function BackButton({ link, label = '이전으로 돌아가기', variant = 'primary' }: { link: LinkProps; label?: string; variant?: 'primary' | 'secondary' }) {
  const { href, goBack } = useWayBack(link);
  return <Button label={label} variant={variant} icon={variant === 'secondary' ? <NavIcon name="back" /> : undefined} href={href} onClick={goBack} />;
}

export { useWayBack };
