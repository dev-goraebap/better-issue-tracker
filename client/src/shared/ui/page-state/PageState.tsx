import { EmptyState, type EmptyStateProps } from '@astryxdesign/core';
import { useFillRoom } from '../use-fill-room';
import { StateLandscape, type StateKind, type StateVariant } from './StateLandscape';
import styles from './page-state.module.css';

/**
 * A screen or a part of one with nothing to show: empty, no match, not found or failed, its landscape above the title,
 * the description and the action, read as one group a little above the middle of the height it has left (at the top
 * under other content with isCompact). The drawing takes the room's width up to 40rem (24rem in a narrow one, less on a
 * low window); isCompact keeps it at 26rem under a page's other content, in a card or a panel. variant fixes which of
 * the state's drawings shows, for a check; hasAccent false leaves its marks out. Every state says what comes next in
 * its description or offers it as an action, so the screen is not a bare "nothing".
 */
export function PageState({ kind = 'empty', variant, hasAccent, className, style, ...props }: Omit<EmptyStateProps, 'icon'> & {
  kind?: StateKind; variant?: StateVariant; hasAccent?: boolean;
}) {
  const isCompact = props.isCompact ?? false;
  // Alone on a screen it fills the height the page leaves, whatever boxes the page wraps it in, and centres in it.
  const room = useFillRoom<HTMLDivElement>(!isCompact);
  return <div ref={room} className={styles.room} data-compact={isCompact || undefined}>
    <EmptyState {...props} icon={<StateLandscape kind={kind} variant={variant} hasAccent={hasAccent} isCompact={isCompact} />}
      className={[styles.state, isCompact ? styles.compact : '', className].filter(Boolean).join(' ')}
      style={{ width: '100%', ...style }} />
  </div>;
}
