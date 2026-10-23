import { Button, Text } from '@astryxdesign/core';
import styles from './page.module.css';

/**
 * The end of a list read in slices: a button for the next slice while there is one, nothing once all is shown. count,
 * given by lists that know how many match in all (the administrators' lists), says how many are shown of those.
 */
export function ListMore({ hasMore, isLoading, onMore, count }: {
  hasMore: boolean; isLoading: boolean; onMore: () => void; count?: { shown: number; total: number; unit: string };
}) {
  if (!hasMore && !count) return null;
  return <div className={styles.more}>
    {count && <Text type="supporting" color="secondary">
      {hasMore ? `${count.total.toLocaleString('ko-KR')}${count.unit} 중 ${count.shown.toLocaleString('ko-KR')}${count.unit}` : `모두 ${count.total.toLocaleString('ko-KR')}${count.unit}`}
    </Text>}
    {hasMore && <Button label="더 보기" variant="secondary" isLoading={isLoading} onClick={onMore} />}
  </div>;
}
