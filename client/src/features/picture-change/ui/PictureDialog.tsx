import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { ApiError, authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { uploadPicture } from '../api/upload-picture';
import { openPhoto } from '../model/open-photo';
import { LazyPictureCropper } from './LazyPictureCropper';
import styles from './picture-change.module.css';

/**
 * Changing a picture (짧은 창, BIT-30): 내 사진 or a workspace's logo. First the picture as it is, with 사진 고르기 and, when
 * there is one, 사진 빼기; a photo picked opens under the frame (round for a person, a rounded square for a logo) to
 * place, and 저장 cuts it to a small square JPEG, sends it straight to storage (D-090) and hands its upload to onSave.
 */
export function PictureDialog({ title, shape, filename, preview, hasPicture, onSave, onRemove, onClose }: {
  title: string; shape: 'round' | 'rect'; filename: string; preview: ReactNode; hasPicture: boolean;
  onSave: (uploadId: string) => Promise<void>; onRemove: () => Promise<void>; onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string>();
  const [cut, setCut] = useState<(() => Promise<Blob>) | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The photo's address holds the file in memory until it is let go.
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const choose = () => input.current?.click();
  const pick = async (file?: File) => {
    if (!file) return;
    const opened = await openPhoto(file);
    if ('problem' in opened) { setError(opened.problem); return; }
    setError(''); setCut(null); setPhoto(opened.url);
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); onClose(); }
    // A photo that could not be cut says so in its own words; the server's refusals read as authError writes them.
    catch (failure) { setError(!(failure instanceof ApiError) && failure instanceof Error && failure.message.startsWith('사진') ? failure.message : authError(failure)); }
    finally { setBusy(false); }
  };
  const save = () => { if (cut) void run(async () => onSave(await uploadPicture(await cut(), filename))); };
  return <CompactDialog isOpen title={title} width={480} isBusy={isBusy} onClose={() => { if (!isBusy) onClose(); }}
    footerStart={photo ? <Button label="다른 사진 고르기" variant="ghost" onClick={choose} isDisabled={isBusy} />
      : hasPicture ? <Button label="사진 빼기" variant="ghost" onClick={() => { void run(onRemove); }} isDisabled={isBusy} /> : undefined}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} />
      {photo ? <Button label="저장" variant="primary" onClick={save} isLoading={isBusy} isDisabled={!cut} />
        : <Button label="사진 고르기" variant="primary" onClick={choose} isDisabled={isBusy} />}</>}>
    <input ref={input} type="file" accept="image/*" hidden onChange={event => { void pick(event.target.files?.[0]); event.target.value = ''; }} />
    {photo
      ? <Suspense fallback={<div className={styles.cropArea} />}>
        <LazyPictureCropper source={photo} shape={shape} isBusy={isBusy} onArea={next => setCut(() => next)} />
      </Suspense>
      : <div className={styles.current}>{preview}<p className={styles.hint}>사진을 고르면 {shape === 'round' ? '원' : '네모'} 안에 맞춰 자릅니다.</p></div>}
    <FormMessage message={error} />
  </CompactDialog>;
}
