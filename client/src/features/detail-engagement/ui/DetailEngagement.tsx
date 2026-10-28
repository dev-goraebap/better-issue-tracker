import { type DetailTarget } from '../api/engagement';
import { ReactionBar } from './ReactionBar';
import styles from './engagement.module.css';

/**
 * The reactions under a detail's body. actionHost takes the place beside the reaction button where the body's editor
 * puts its attachment button while it is open (BIT-104).
 */
export function DetailEngagement({ target, canWrite, actionHost }: { target: DetailTarget; canWrite: boolean; actionHost?: (element: HTMLSpanElement | null) => void }) {
  return <ReactionBar target={target} canWrite={canWrite}>
    {actionHost && <span ref={actionHost} className={styles.actionHost} />}
  </ReactionBar>;
}
