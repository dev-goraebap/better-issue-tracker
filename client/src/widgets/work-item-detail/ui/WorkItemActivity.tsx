import { useMemo, useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, sessionQueryOptions } from '@/shared/api';
import { ConfirmDialog, QueryMessage, SectionHeader, Timeline } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { PRIORITIES } from '@/entities/work-item';
import { useMembers } from '@/entities/workspace';
import { createComment, deleteComment, refreshTimeline, timelineQuery, updateComment, type TimelineEntry } from '../api/timeline';
import { foldTimeline, type ActivityNames } from '../model/activity-text';
import { ActivityLine } from './ActivityLine';
import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import styles from './activity.module.css';

/**
 * A work item's 활동 (D-078): what happened to it and what was said about it on one rule as GitHub draws an issue's
 * (BIT-84), oldest first, the comments as cards between the lines of activity (a person's description edits in a row read as one), and the box to
 * comment at the foot. Someone who may write comments; their own they may 수정 and delete, and someone who manages the
 * workspace may delete anyone's. A viewer reads.
 */
export function WorkItemActivity({ workspaceId, projectId, workItemId, canWrite, canModerate, targetType = 'work_item' }: {
  workspaceId: string; projectId?: string | null; workItemId: string; canWrite: boolean; canModerate: boolean;
  /** A document's timeline reads the same (D-093); workItemId is then the document's id. */
  targetType?: 'work_item' | 'document';
}) {
  const client = useQueryClient();
  const toast = useToast();
  const timeline = useQuery(timelineQuery(workspaceId, targetType, workItemId));
  const me = useQuery(sessionQueryOptions).data?.user?.id;
  const members = useMembers(workspaceId).items;
  const columns = useQuery({ ...columnsQuery(workspaceId, projectId ?? ''), enabled: !!projectId }).data;
  const labels = useQuery(labelsQuery(workspaceId)).data;
  const [deleting, setDeleting] = useState<TimelineEntry | null>(null);
  const names = useMemo<ActivityNames>(() => ({
    people: new Map(members.map(member => [member.userId, member.name])),
    columns: new Map((columns ?? []).map(column => [column.id, column.name])),
    labels: new Map((labels ?? []).map(label => [label.id, label.name])),
    priorities: PRIORITIES,
    noun: targetType === 'document' ? '문서' : '업무',
  }), [members, columns, labels, targetType]);
  const lines = useMemo(() => foldTimeline(timeline.data ?? []), [timeline.data]);
  const refresh = () => refreshTimeline(client, workspaceId, targetType, workItemId);
  /** Runs one change to a comment; a refusal (someone changed it first, 409) says so and shows the latest. */
  const run = async (change: () => Promise<unknown>) => {
    try { await change(); return true; }
    catch (failure) { toast({ body: authError(failure) }); return false; }
    finally { await refresh(); }
  };
  return <section aria-labelledby="detail-activity" className={styles.activity}>
    <SectionHeader id="detail-activity" title="활동" />
    {timeline.isPending || timeline.error
      ? <QueryMessage pending={timeline.isPending} error={timeline.error} retry={() => { void timeline.refetch(); }} />
      : <Timeline label="활동 기록">{lines.map(entry => entry.kind === 'comment'
        ? <CommentCard key={entry.id} workspaceId={workspaceId} canReact={canWrite} entry={entry} canEdit={canWrite && entry.actorId === me} canDelete={canWrite && (entry.actorId === me || canModerate)}
          onSave={body => run(() => updateComment(workspaceId, entry.id, { body, expectedVersion: entry.version }))} onDelete={() => setDeleting(entry)} />
        : <ActivityLine key={entry.id} entry={entry} names={names} />)}</Timeline>}
    {canWrite && <CommentComposer onSend={(body, uploadIds) => run(() => createComment(workspaceId, { targetType, targetId: workItemId, body, uploadIds }))} />}
    {deleting && <ConfirmDialog title="댓글을 삭제할까요?" description="삭제한 댓글은 활동에서 사라집니다." confirmLabel="삭제" variant="destructive"
      onClose={() => setDeleting(null)}
      onConfirm={() => { const entry = deleting; setDeleting(null); void run(() => deleteComment(workspaceId, entry.id, entry.version)); }} />}
  </section>;
}
