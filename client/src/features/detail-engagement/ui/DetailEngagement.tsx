import { type DetailTarget } from '../api/engagement';
import { ReactionBar } from './ReactionBar';

export function DetailEngagement({ target, canWrite }: { target: DetailTarget; canWrite: boolean }) {
  return <ReactionBar target={target} canWrite={canWrite} />;
}
