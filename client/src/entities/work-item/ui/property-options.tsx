import { DefaultAvatar, type PropertyOption } from '@/shared/ui';
import { PRIORITIES } from '../model/labels';
import type { ColumnCategory } from '../api/work-item';
import { reminderText, type Priority } from '../model/work-item';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './work-item.module.css';

/** The 상태 menu's value for no status (D-066): the work item is in no column. */
export const NO_STATUS = 'none';

/** The property pills' menus (PropertyPicker), the same wherever a work item is made or changed: each choice with its mark. */
export const statusOptions = (columns: readonly { id: string; name: string; position: number; category: ColumnCategory }[]): PropertyOption[] => [
  ...[...columns].sort((a, b) => a.position - b.position).map(column => ({ value: column.id, label: column.name, icon: <StatusBadge category={column.category} isLabelHidden /> })),
  { value: NO_STATUS, label: '상태 없음' },
];
export const priorityOptions: PropertyOption[] = (Object.keys(PRIORITIES) as Priority[])
  .map(priority => ({ value: priority, label: PRIORITIES[priority], icon: <PriorityMark priority={priority} isLabelHidden /> }));
export const peopleOptions = (members: readonly { userId: string; name: string }[]): PropertyOption[] =>
  members.map(member => ({ value: member.userId, label: member.name, icon: <DefaultAvatar seed={member.userId} name={member.name} size={16} /> }));
/** The 알림 menu's value for no reminder. */
export const NO_REMINDER = 'none';
/** An event's reminder (BIT-39): when before its start its attendees hear of it. */
export const reminderOptions: PropertyOption[] = [
  ...[0, 5, 10, 30, 60, 1440].map(minutes => ({ value: String(minutes), label: reminderText(minutes) })),
  { value: NO_REMINDER, label: '알림 없음' },
];
export const labelOptions = (labels: readonly { id: string; name: string; color: string }[]): PropertyOption[] =>
  labels.map(label => ({ value: label.id, label: label.name, icon: <span className={styles.labelDot} style={{ background: label.color }} /> }));
