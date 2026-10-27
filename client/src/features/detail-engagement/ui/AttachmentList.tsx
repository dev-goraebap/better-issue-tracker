import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, type components } from '@/shared/api';
import { ConfirmDialog, MoreMenu, NavIcon } from '@/shared/ui';
import { attachedFilesQuery, bytesText, fileHref, removeFile, type DetailTarget } from '../api/engagement';
import styles from './engagement.module.css';

export function AttachmentList({ target, canWrite }: { target: DetailTarget; canWrite: boolean }) {
  const result = useQuery(attachedFilesQuery(target)); const client = useQueryClient();
  const [removing, setRemoving] = useState<components['schemas']['AttachedFile']>();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const discard = async () => {
    if (!removing || busy) return;
    setBusy(true); setError('');
    try { await removeFile(target, removing.id); setRemoving(undefined); }
    catch (failure) { setError(authError(failure)); }
    finally { await client.invalidateQueries({ queryKey: attachedFilesQuery(target).queryKey }); setBusy(false); }
  };
  if (!result.data?.length && !result.error) return null;
  return <div className={styles.files}>
    {result.error && <button type="button" className={styles.retry} onClick={() => { void result.refetch(); }}>첨부 파일을 불러오지 못했습니다. 다시 시도</button>}
    {result.data?.map(file => <div className={styles.file} key={file.id}>
      {file.image && <a href={fileHref(target, file.id, false)} target="_blank" rel="noreferrer" className={styles.preview}><img src={fileHref(target, file.id, false)} alt={file.filename} loading="lazy" /></a>}
      <a href={fileHref(target, file.id)} className={styles.fileLink}><NavIcon name={file.image ? 'image' : 'file'} /><span>{file.filename}</span><small>{bytesText(file.size)}</small><NavIcon name="download" /></a>
      {canWrite && <MoreMenu label={`${file.filename} 첨부 메뉴`} variant="ghost" size="sm" items={[{ label: '첨부 삭제', icon: <NavIcon name="delete" />, onClick: () => setRemoving(file) }]} />}
    </div>)}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {removing && <ConfirmDialog title="첨부 파일을 삭제할까요?" description={`${removing.filename} 파일을 삭제합니다.`} confirmLabel="파일 삭제" variant="destructive" onClose={() => setRemoving(undefined)} onConfirm={() => { void discard(); }} />}
  </div>;
}
