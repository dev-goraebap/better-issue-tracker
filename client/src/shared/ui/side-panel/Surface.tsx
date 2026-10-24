import { IconButton, Text } from '@astryxdesign/core';
import { useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import { PageFoot } from '../page-foot';
import { PageFrame } from '../PageFrame';
import styles from './side-panel.module.css';
import { usePanelSurface } from './surface-context';

/**
 * A page's content in whichever place it is shown, so one widget serves both: in a panel, a ruled header with the
 * title (and a way back to the page shown before it in the panel), the page's actions, 크게 보기 to the page itself and a
 * close, a body that scrolls and the footer held at the foot;
 * on a page of its own, the page's title and actions, the body, and the footer as the page's foot row (PageFoot).
 * wrapsTitle lets a title that is the content itself (an event's) run on to more lines instead of being cut.
 */
export function Surface({ title, subtitle, actions, footer, back, width = 'narrow', wrapsTitle = false, children }: {
  title: string; subtitle?: string; actions?: ReactNode; footer?: ReactNode; back?: ReactNode; width?: 'narrow' | 'default' | 'wide'; wrapsTitle?: boolean;
  children: ReactNode;
}) {
  const panel = usePanelSurface();
  const router = useRouter();
  if (!panel) return <PageFrame title={title} back={back} actions={actions} width={width} wrapsTitle={wrapsTitle}>
    {subtitle && <Text color="secondary">{subtitle}</Text>}
    {children}
    {footer && <PageFoot>{footer}</PageFoot>}
  </PageFrame>;
  return <div className={styles.panel}>
    <FrameHead title={title} subtitle={subtitle} wrapsTitle={wrapsTitle} onBack={panel.onBack} isFull onClose={panel.onClose}
      actions={<>{actions}<IconButton label="크게 보기" tooltip="크게 보기" variant="ghost" size="sm" icon={<NavIcon name="expand-page" />}
        onClick={() => void router.navigate({ href: panel.pageHref })} /></>} />
    <div className={styles.body}>{children}</div>
    {footer && <div className={styles.foot} data-action-row>{footer}</div>}
  </div>;
}
