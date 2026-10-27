import { LoadingMark } from './LoadingMark';
import { StateRegion } from '../state-region/StateRegion';

/** A content read's small rocket, centred in the same room its result will occupy. */
export function InlineLoader({ label = '불러오는 중' }: { label?: string }) {
  return <StateRegion placement="center" label={label} busy><LoadingMark isSmall /></StateRegion>;
}
