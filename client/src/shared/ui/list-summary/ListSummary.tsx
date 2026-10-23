import { Button, Text } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import styles from './list-summary.module.css';

/**
 * The line that ends a list read in slices, right under its last row and as wide as the list, on faint hatching: how
 * many are shown of how many ("24개 중 10개", "모두 24개" once all are read) and, while more remain, the next slice's
 * button beside it ("14개 더 보기"), both at its start. Given to SheetTable's foot it lies inside the table's box, so the
 * faint dot grid still follows under it; under an ItemList it follows the rows. Nothing to show (no rows) draws nothing.
 */
export function ListSummary({ shown, total, unit = '개', step, hasMore, isLoading = false, onMore }: {
  shown: number; total: number; unit?: string;
  /** How many the next slice reads at most; the button names what it will add. */
  step: number;
  hasMore: boolean; isLoading?: boolean; onMore: () => void;
}) {
  if (total === 0) return null;
  const count = (value: number) => `${value.toLocaleString('ko-KR')}${unit}`;
  const next = Math.min(step, Math.max(0, total - shown));
  return <div className={styles.summary}>
    <Text type="supporting" color="secondary" className={styles.count} role="status" aria-live="polite">{hasMore ? `${count(total)} 중 ${count(shown)}` : `모두 ${count(total)}`}</Text>
    {hasMore && <Button label={`${count(next)} 더 보기`} variant="ghost" size="sm" endContent={<NavIcon name="chevron-down" />} isLoading={isLoading} onClick={onMore} />}
  </div>;
}
