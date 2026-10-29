import type { ReactNode } from 'react';
import { DueChip, ITEM_ROW_LINK, ITEM_TITLE_LINK, ItemGroup, ItemList, ItemMeta, ItemRow, NavIcon } from '@/shared/ui';
import { agoText, dateText, momentText } from '@/shared/lib/date-text';
import { TypeMark } from '@/entities/work-item-type/@x/work-item';
import type { ListLine, WorkItemGroup } from '../model/grouping';
import type { WorkItemSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { categoryOf } from '../model/work-item';
import { GroupMark } from './GroupMark';
import { LabelTokens } from './LabelTokens';
import { NoPriority } from './NoPriority';
import { PeopleAvatars } from './PeopleAvatars';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import { SubtaskProgress } from './SubtaskProgress';
import { TreeLines } from './TreeLines';
import { WorkItemLink } from './WorkItemLink';
import styles from './work-item.module.css';

type Progress = ReadonlyMap<string, { done: number; total: number }>;

/**
 * The work items as Linear's list (D-106), on a desktop and a phone alike: rows from edge to edge with no header row and
 * no sideways scroll, gathered under group headers when the view groups them, a subtask's whole row in under its parent
 * with a line down from the parent's front turning into it (TreeLines), as Linear's sub-issues.
 *
 * - A desktop row leads with marks of fixed widths so they line up down the list: the priority, the key, the status and
 *   the type (D-104); then the title, how many of its subtasks are done, and its parent's name when the parent is not
 *   above it. Its end holds only what the work item has: labels, pull requests (badges), due day (a chip saying how near
 *   it is), people, and how long ago it changed or was made (each by its own icon, BIT-124). Only the title opens the work item, underlined under the pointer (BIT-123); the row shows its
 *   hover band and leaves its marks free for their own uses.
 * - A phone row is a small card that opens from anywhere on it (a thumb has no hover to aim with): the type and title
 *   over the key and the rest, the people at its end; a subtask is set in 16px a level with no lines.
 *
 * The view's columns (표시할 속성) say which of the properties show; the key, type and title always do. A project's
 * list names each status by its column (columnNames), 전체 by its category.
 */
export function WorkItemList({ workspaceId, groups, search, columns, columnNames, badges, progress, isPhone, collapsed, onToggle }: {
  workspaceId: string; groups: readonly WorkItemGroup[]; search: WorkItemSearch; columns: readonly ViewColumn[];
  columnNames?: ReadonlyMap<string, string>;
  /** What another part of the app adds to a work item (its pull requests, D-087), by work item id. */
  badges?: ReadonlyMap<string, ReactNode>;
  /** Each parent's subtasks and how many are done, by work item id. */
  progress?: Progress;
  isPhone: boolean; collapsed: ReadonlySet<string>; onToggle: (groupKey: string) => void;
}) {
  const shows = (column: ViewColumn) => columns.includes(column);
  const keyWidth = `${Math.max(4, ...groups.flatMap(group => group.lines.map(line => line.item.key.length)))}ch`;
  const row = (group: WorkItemGroup, line: ListLine) => {
    const { item } = line;
    const status = item.columnCategory ? <StatusBadge category={item.columnCategory} name={item.columnId ? columnNames?.get(item.columnId) : undefined} isLabelHidden={!isPhone} /> : null;
    const sub = progress?.get(item.id);
    const after = <>
      {sub && <SubtaskProgress {...sub} />}
      {line.parent && <span className={styles.parentName} title={`상위 업무 ${line.parent.key} ${line.parent.title}`}><NavIcon name="branch" />{line.parent.title}</span>}
    </>;
    // A phone's two-line card shows a subtask by its inset alone; lines only crowd it.
    const tree = !isPhone && (line.depth > 0 || line.hasChildren) ? <TreeLines line={line} /> : undefined;
    // Its day tells how near (DueChip); the days it changed and was made say how long ago, each by its own icon (BIT-124).
    const isDone = categoryOf(item) === 'done';
    const updated = <ItemMeta width="5.75rem" align="end" label={`수정 ${dateText(item.updatedAt)}`} title={`수정 ${momentText(item.updatedAt)}`}>
      <NavIcon name="edit" />{agoText(item.updatedAt)}
    </ItemMeta>;
    const link = <WorkItemLink workspaceId={workspaceId} item={item} search={search} className={isPhone ? ITEM_ROW_LINK : ITEM_TITLE_LINK}>{item.title}</WorkItemLink>;
    if (isPhone) return <ItemRow key={`${group.key}:${item.id}`} depth={line.depth} isTitleSingleLine
      end={item.people.length > 0 ? <PeopleAvatars people={item.people} /> : undefined}
      title={<>{item.type && <span className={styles.typeLead}><TypeMark type={item.type} /></span>}{link}</>}
      meta={<>
        <ItemMeta><span className={styles.key}>{item.key}</span></ItemMeta>
        {(sub || line.parent) && <ItemMeta>{after}</ItemMeta>}
        {badges?.get(item.id) && <ItemMeta>{badges.get(item.id)}</ItemMeta>}
        {shows('status') && status && <ItemMeta>{status}</ItemMeta>}
        {shows('priority') && item.priority && <ItemMeta><PriorityMark priority={item.priority} /></ItemMeta>}
        {shows('labels') && item.labels.length > 0 && <ItemMeta><LabelTokens labels={item.labels.slice(0, 2)} /></ItemMeta>}
        {shows('due') && item.dueDate && <ItemMeta label={`기한 ${dateText(item.dueDate)}`}><DueChip day={item.dueDate} isDone={isDone} /></ItemMeta>}
        {updated}
      </>} />;
    return <ItemRow key={`${group.key}:${item.id}`} depth={line.depth} guide={tree}
      lead={<>
        {shows('priority') && <span className={styles.slot}>{item.priority ? <PriorityMark priority={item.priority} isLabelHidden /> : <NoPriority />}</span>}
        <span className={styles.key} style={{ inlineSize: keyWidth }}>{item.key}</span>
        {shows('status') && <span className={styles.slot}>{status}</span>}
        <span className={styles.slot}>{item.type && <TypeMark type={item.type} />}</span>
      </>}
      title={<span className={styles.titleLine}><span className={styles.titleText}>{link}</span>{after}</span>}
      meta={<>
        {shows('labels') && item.labels.length > 0 && <ItemMeta><LabelTokens labels={item.labels.slice(0, 3)} /></ItemMeta>}
        {badges?.get(item.id) && <ItemMeta>{badges.get(item.id)}</ItemMeta>}
        {shows('due') && item.dueDate && <ItemMeta label={`기한 ${dateText(item.dueDate)}`}><DueChip day={item.dueDate} isDone={isDone} /></ItemMeta>}
        {shows('assignee') && item.people.length > 0 && <ItemMeta><PeopleAvatars people={item.people} /></ItemMeta>}
        {shows('updated') && updated}
        {shows('created') && <ItemMeta width="5.75rem" align="end" label={`만든 날 ${dateText(item.createdAt)}`} title={`만든 날 ${momentText(item.createdAt)}`}>
          <NavIcon name="created" />{agoText(item.createdAt)}
        </ItemMeta>}
      </>} />;
  };
  return <ItemList label="업무 목록">{groups.flatMap(group => [
    ...(group.grouping === 'none' ? [] : [<ItemGroup key={`group:${group.key}`} label={group.label} mark={<GroupMark group={group} />} count={group.count}
      isOpen={!collapsed.has(group.key)} onToggle={() => onToggle(group.key)} />]),
    ...group.lines.map(line => row(group, line)),
  ])}</ItemList>;
}
