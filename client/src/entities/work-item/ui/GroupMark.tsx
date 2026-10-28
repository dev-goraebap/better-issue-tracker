import { DefaultAvatar, NavIcon } from '@/shared/ui';
import { TypeMark } from '@/entities/work-item-type/@x/work-item';
import type { ColumnCategory } from '../api/work-item';
import type { WorkItemGroup } from '../model/grouping';
import type { Priority } from '../model/work-item';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './work-item.module.css';

/** A group header's mark: what its rows share, drawn as their own marks are. */
export function GroupMark({ group }: { group: WorkItemGroup }) {
  if (!group.value) return null;
  switch (group.grouping) {
    case 'status': return <StatusBadge category={group.value as ColumnCategory} isLabelHidden />;
    case 'priority': return <PriorityMark priority={group.value as Priority} isLabelHidden />;
    case 'assignee': return <DefaultAvatar seed={group.value} name={group.label} size={16} />;
    case 'type': return group.sample?.type ? <TypeMark type={group.sample.type} /> : null;
    case 'label': return <span className={styles.labelDot} style={{ background: group.color }} />;
    case 'project': return <NavIcon name="folder" />;
    default: return null;
  }
}
