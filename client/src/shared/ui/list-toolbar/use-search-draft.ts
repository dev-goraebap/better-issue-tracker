import { useEffect, useState } from 'react';

/**
 * Search words kept as typed and applied after a pause (300ms), trimmed, none for nothing typed; a change of the applied
 * value from elsewhere (a reset, going back) wins over what is typed.
 */
export function useSearchDraft(value: string | undefined, onChange: (value: string | undefined) => void) {
  const [draft, setDraft] = useState(value ?? '');
  const [applied, setApplied] = useState(value);
  if (value !== applied) {
    setApplied(value);
    if ((value ?? '') !== draft.trim()) setDraft(value ?? '');
  }
  useEffect(() => {
    const next = draft.trim() || undefined;
    if (next === value) return undefined;
    const timer = window.setTimeout(() => onChange(next), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);
  return [draft, (next: string) => setDraft(next.slice(0, 100))] as const;
}
