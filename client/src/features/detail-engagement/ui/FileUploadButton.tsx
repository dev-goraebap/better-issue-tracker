import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authError, capabilitiesQueryOptions } from '@/shared/api';
import { NavIcon } from '@/shared/ui';
import { uploadFile, type PendingFile } from '../api/engagement';
import styles from './engagement.module.css';

export function FileUploadButton({ onUploaded, isDisabled = false, onBusy }: { onUploaded: (file: PendingFile) => Promise<void> | void; isDisabled?: boolean; onBusy?: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const capabilities = useQuery(capabilitiesQueryOptions).data;
  if (!capabilities?.objectStorage) return null;
  const upload = async (files: File[]) => {
    setError(''); setBusy(true); onBusy?.(true);
    try {
      if (files.length > 20) { setError('한 번에 파일 20개까지 올릴 수 있습니다.'); return; }
      for (const file of files) {
        if (!file.size || file.size > capabilities.fileMaxBytes) { setError(`빈 파일이거나 업로드 제한을 초과했습니다: ${file.name}`); break; }
        await onUploaded(await uploadFile(file));
      }
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); onBusy?.(false); if (input.current) input.current.value = ''; }
  };
  return <span className={styles.upload}>
    <input ref={input} className={styles.hiddenInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.md,.markdown,.txt,.log,.csv" aria-label="첨부할 파일" onChange={event => { void upload(Array.from(event.target.files ?? [])); }} />
    <button type="button" className={styles.iconButton} disabled={isDisabled || busy} aria-label={busy ? '파일 업로드 중' : '파일 첨부'} title="파일 첨부" onClick={() => input.current?.click()}><NavIcon name={busy ? 'clock' : 'attach'} /></button>
    {busy && <span role="status" className={styles.uploadStatus}>업로드 중…</span>}
    {error && <span className={styles.error} role="alert">{error}</span>}
  </span>;
}
