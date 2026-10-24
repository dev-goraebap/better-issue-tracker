import { ProgressBar } from '@astryxdesign/core';
import { demoStyles } from '@/entities/demo-sample';

/** A computed progress (done/total) as a thin bar and its figures; nothing to track reads as 해당 없음. */
export function Progress({ value: [done, total] }: { value: [number, number] }) {
  if (total === 0) return <span className={demoStyles.none}>해당 없음</span>;
  return <span className={demoStyles.progress}><ProgressBar label="이행 진행" isLabelHidden value={done} max={total} /><span className={demoStyles.figure}>{done}/{total}</span></span>;
}
