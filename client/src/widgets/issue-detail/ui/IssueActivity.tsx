import { useMemo, useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, sessionQueryOptions } from '@/shared/api';
import { ConfirmDialog, QueryMessage, SectionHeader } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { PRIORITIES } from '@/entities/issue';
import { useMembers } from '@/entities/workspace';
import { createComment, deleteComment, refreshTimeline, timelineQuery, updateComment, type TimelineEntry } from '../api/timeline';
import { foldTimeline, type ActivityNames } from '../model/activity-text';
import { ActivityLine } from './ActivityLine';
import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import styles from './activity.module.css';

/**
 * An issue's 활동 (D-078), as Linear's: what happened to it and what was said about it on one rule, oldest first, the
 * comments as cards between the lines of activity (a person's description edits in a row read as one), and the box to
 * comment at the foot. Someone who may write comments; their own they may 수정 and delete, and someone who manages the
 * workspace may delete anyone's. A viewer reads.
 */
export function IssueActivity({ workspaceId, projectId, issueId, canWrite, canModerate }: {
  workspaceId: string; projectId: string; issueId: string; canWrite: boolean; canModerate: boolean;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const timeline = useQuery(timelineQuery(workspaceId, 'issue', issueId));
  const me = useQuery(sessionQueryOptions).data?.user?.id;
  const members = useMembers(workspaceId).items;
  const columns = useQuery(columnsQuery(workspaceId, projectId)).data;
  const labels = useQuery(labelsQuery(workspaceId)).data;
  const [deleting, setDeleting] = useState<TimelineEntry | null>(null);
  const names = useMemo<ActivityNames>(() => ({
    people: new Map(members.map(member => [member.userId, member.name])),
    columns: new Map((columns ?? []).map(column => [column.id, column.name])),
    labels: new Map((labels ?? []).map(label => [label.id, label.name])),
    priorities: PRIORITIES,
  }), [members, columns, labels]);
  const lines = useMemo(() => foldTimeline(timeline.data ?? []), [timeline.data]);
  const refresh = () => refreshTimeline(client, workspaceId, 'issue', issueId);
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
      : <ol className={styles.timeline}>{lines.map(entry => entry.kind === 'comment'
        ? <CommentCard key={entry.id} entry={entry} canEdit={canWrite && entry.actorId === me} canDelete={canWrite && (entry.actorId === me || canModerate)}
          onSave={body => run(() => updateComment(workspaceId, entry.id, { body, expectedVersion: entry.version }))} onDelete={() => setDeleting(entry)} />
        : <ActivityLine key={entry.id} entry={entry} names={names} />)}</ol>}
    {canWrite && <CommentComposer onSend={body => run(() => createComment(workspaceId, { targetType: 'issue', targetId: issueId, body }))} />}
    {deleting && <ConfirmDialog title="댓글을 삭제할까요?" description="삭제한 댓글은 활동에서 사라집니다." confirmLabel="삭제" variant="destructive"
      onClose={() => setDeleting(null)}
      onConfirm={() => { const entry = deleting; setDeleting(null); void run(() => deleteComment(workspaceId, entry.id, entry.version)); }} />}
  </section>;
}
