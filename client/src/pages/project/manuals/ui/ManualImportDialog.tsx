import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog } from '@/shared/ui';
import type { Manual } from '../model/manual';
import { MANUAL_PACKAGE_MAX_BYTES, manualAsNew, readManualPackage } from '../model/manual-package';
import styles from './manuals.module.css';

export function ManualImportDialog({ onSave, onOpen, onClose }: { onSave: (manual: Manual) => Promise<boolean>; onOpen: (id: string) => void; onClose: () => void }) {
  const [manual, setManual] = useState<Manual | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async () => { if (!manual || saving) return; setSaving(true); const copy = manualAsNew(manual); if (await onSave(copy)) { onClose(); onOpen(copy.id); } else setError('저장하지 못했습니다. 원본 파일은 변경되지 않았습니다.'); setSaving(false); };
  return <CompactDialog title="매뉴얼 가져오기" onClose={() => { if (!saving) onClose(); }} onSubmit={submit} footer={<><Button label="취소" variant="ghost" isDisabled={saving} onClick={onClose} /><Button label="가져오기" type="submit" variant="primary" isLoading={saving} isDisabled={saving || !manual?.title.trim()} /></>}>
    <label className={styles.upload}>매뉴얼 파일<input type="file" accept=".json,application/json" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return; setManual(null); setError('');
      try { if (file.size > MANUAL_PACKAGE_MAX_BYTES) throw new Error('매뉴얼 원본 파일은 200MB까지 가져올 수 있습니다.'); setManual(readManualPackage(await file.text())); }
      catch (failure) { setError(failure instanceof Error ? failure.message : '파일을 읽지 못했습니다.'); }
    }} /></label>
    {manual && <><TextInput label="매뉴얼 이름" value={manual.title} onChange={title => setManual({ ...manual, title: title.slice(0, 120) })} /><p>{manual.sections.length}개 섹션 · {manual.pages.length}개 페이지 · 이미지 {Object.keys(manual.assets).length}개</p><p>새 매뉴얼로 추가합니다. 기존 매뉴얼과 댓글은 변경하지 않습니다.</p></>}
    {error && <p role="alert">{error}</p>}
  </CompactDialog>;
}
