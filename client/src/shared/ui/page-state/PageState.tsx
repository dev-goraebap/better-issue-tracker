import { EmptyState, type EmptyStateProps } from '@astryxdesign/core';
import { StateRegion } from '../state-region/StateRegion';
import { StateLandscape, type StateKind, type StateVariant } from './StateLandscape';
import styles from './page-state.module.css';

/** One fixed-size landscape, message and action group, above the centre of its containing page or pane. */
export function PageState({ kind = 'empty', variant, hasAccent, className, style, ...props }: Omit<EmptyStateProps, 'icon'> & {
  kind?: StateKind; variant?: StateVariant; hasAccent?: boolean;
}) {
  const isCompact = props.isCompact ?? false;
  return <StateRegion isCompact={isCompact}>
    <EmptyState {...props} icon={<StateLandscape kind={kind} variant={variant} hasAccent={hasAccent} />}
      className={[styles.state, className].filter(Boolean).join(' ')}
      style={{ width: '100%', ...style }} />
  </StateRegion>;
}
