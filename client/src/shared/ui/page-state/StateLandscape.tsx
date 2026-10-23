import { CircleAlert, FolderOpen, MapPinOff, SearchX } from 'lucide-react';
import styles from './page-state.module.css';

/** What a state screen tells: nothing yet, nothing matching, no such thing, or a failure. */
export type StateKind = 'empty' | 'search' | 'not-found' | 'error';
/** Kept for the same props as SandboxHr's; BIT draws one mark per state (the landscapes were not brought over). */
export type StateVariant = 0 | 1 | 2;

const marks = { empty: FolderOpen, search: SearchX, 'not-found': MapPinOff, error: CircleAlert } as const;

export const pickVariant = () => 0 as StateVariant;

/**
 * A state's mark: its icon on a soft accent disc, in place of SandboxHr's pen landscapes (bit-frontend: PageState's
 * drawings are still open). Decorative: the state's words carry its meaning.
 */
export function StateLandscape({ kind, hasAccent = true, isCompact = false }: {
  kind: StateKind; variant?: StateVariant; hasAccent?: boolean; isCompact?: boolean;
}) {
  const Mark = marks[kind];
  return <span className={[styles.mark, isCompact ? styles.compact : ''].filter(Boolean).join(' ')} data-tone={kind === 'error' ? 'danger' : hasAccent ? 'accent' : undefined} aria-hidden="true">
    <Mark strokeWidth={1.5} />
  </span>;
}
