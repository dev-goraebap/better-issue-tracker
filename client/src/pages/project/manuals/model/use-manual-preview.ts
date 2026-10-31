import { useEffect, useState } from 'react';
import { exampleManuals } from './examples';
import { isManuals, type Manual } from './manual';

/** Development-only review store. Never used as a substitute for the server's authorization/persistence. */
export function useManualPreview(scope: string, seed = true) {
  const key = `bit.manual-preview.v1.${scope}`;
  const [error, setError] = useState('');
  const [manuals, setManuals] = useState<Manual[]>(() => {
    try { const raw = localStorage.getItem(key); if (!raw) return seed ? exampleManuals() : []; const data: unknown = JSON.parse(raw); if (isManuals(data)) return data; }
    catch { /* Preserve the original bytes; don't overwrite unreadable storage. */ }
    return [];
  });
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw && !isManuals(JSON.parse(raw))) setError('저장된 미리보기를 읽지 못했습니다. 원본은 보존했습니다.'); }
    catch { setError('브라우저 저장소를 읽지 못했습니다.'); }
  }, [key]);
  const save = (next: Manual[]) => {
    try { if (error) return false; localStorage.setItem(key, JSON.stringify(next)); setManuals(next); return true; }
    catch { setError('브라우저 저장 공간이 부족합니다. 입력은 유지됩니다. 이미지를 줄인 뒤 다시 시도하세요.'); return false; }
  };
  return { manuals, save, error, clearError: () => setError('') };
}
