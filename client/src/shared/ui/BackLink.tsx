import type { LinkProps } from '@tanstack/react-router';
import { createContext, isValidElement, useContext, type ReactNode } from 'react';
import { BackButton } from './BackButton';

export type BackLinkProps = LinkProps & { label: string };

/**
 * A page's way back, given to PageFrame (back): to the screen the member came from, through history, wherever that was.
 * `link` is the page's own list (with the conditions to restore) for when nothing before is known, and `label` names it.
 * It draws nothing itself (the trail says which list the page belongs to); a phone's page without a foot of its own
 * gets it as '이전으로' in a foot row, and a not-found state offers it (usePageBackAction).
 */
export function BackLink(_props: BackLinkProps) {
  return null;
}

/** The page's back link, which PageFrame hands down so a state deep in the page can offer the same way back. */
export const PageBack = createContext<ReactNode>(null);

/** Where a page's back link leads (its list, for when nothing before is known), or nothing for no back link. */
export function backLinkOf(back: ReactNode): LinkProps | undefined {
  if (!isValidElement<BackLinkProps>(back) || back.type !== BackLink) return undefined;
  const { label: _label, ...link } = back.props;
  return link;
}

/**
 * The page's way back as the main action of a state that leaves nothing to do here (not found): '이전으로 돌아가기'.
 * Nothing when the page has no back link.
 */
export function usePageBackAction(): ReactNode {
  const link = backLinkOf(useContext(PageBack));
  return link ? <BackButton link={link} /> : undefined;
}
