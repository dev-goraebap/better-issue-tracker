import { useRef, useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { DefaultAvatar, NavIcon, PropertyPicker } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { labelOptions } from '@/entities/work-item';
import { useMembers } from '@/entities/workspace';
import { documentQuery, FolderLink, refreshDocuments, updateDocument, type DocumentDetail } from '@/entities/document';
import styles from './document.module.css';

export function DocumentProperties({ workspaceId, document, canWrite }: { workspaceId: string; document: DocumentDetail; canWrite: boolean }) {
  const client = useQueryClient(); const toast = useToast();
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const [preview, setPreview] = useState<string[]>(); const queue = useRef(Promise.resolve()); const pending = useRef(0);
  const folder = document.path.at(-1); const author = members.find(member => member.userId === document.createdBy);
  const change = (labelIds: string[]) => {
    setPreview(labelIds); pending.current += 1;
    queue.current = queue.current.then(async () => {
      try {
        const current = await client.fetchQuery({ ...documentQuery(workspaceId, document.id), staleTime: 0 });
        await updateDocument(workspaceId, document.id, { expectedVersion: current.version, labelIds });
      } catch (failure) { toast({ body: authError(failure) }); }
      finally {
        await Promise.allSettled([refreshDocuments(client, workspaceId), client.invalidateQueries({ queryKey: ['workspace', workspaceId, 'timeline', 'document', document.id] })]);
        pending.current -= 1; if (!pending.current) setPreview(undefined);
      }
    });
  };
  return <div className={styles.properties}>
    <h2 data-inspector-desktop>속성</h2>
    <span className={styles.value} title="문서 종류"><NavIcon name="document" />문서</span>
    <span className={styles.value}><NavIcon name="folder" /><FolderLink workspaceId={workspaceId} projectId={document.projectId} folderId={folder?.id}>{folder?.name ?? '문서함'}</FolderLink></span>
    <h3 data-inspector-desktop>라벨</h3>
    {canWrite ? <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={preview ?? document.labelIds} isMultiple onChange={value => change(value as string[] ?? [])} />
      : <span className={styles.value}><NavIcon name="label" />{labels.filter(label => document.labelIds.includes(label.id)).map(label => label.name).join(', ') || '없음'}</span>}
    <h3 data-inspector-desktop>만든 사람</h3>
    <span className={styles.value} data-inspector-desktop><DefaultAvatar seed={document.createdBy} name={author?.name ?? '구성원'} size={16} />{author?.name ?? '지워진 구성원'}{document.createdByAgent ? ` (${document.createdByAgent})` : ''}</span>
    <p className={styles.made} data-inspector-desktop>{dateText(document.createdAt)} 생성<br />{dateText(document.updatedAt)} 수정</p>
  </div>;
}
