import { useCallback, useEffect, useState } from 'react';
import { authError } from '@/shared/api';

/** What is written in place: the title and the body. */
export type Written = { title: string; body: string };
/** The server's copy read fresh at saving: its words and the version to save over. */
export type Latest = Written & { version: number };
/** Of a repeating work item, which occurrences a change is for. */
export type Scope = 'single' | 'following';

/**
 * The title and body written in place on a detail (D-107, BIT-99), saved together from the save bar. The draft starts
 * as the server's copy and follows it while nothing is changed; once changed it stays the member's until saved or
 * undone. Saving reads the server's copy first: when its title and body are still what the member started from, the
 * change goes over its latest version (a property changed meanwhile, which only raised the version, is no conflict);
 * when someone changed them, the member chooses between the latest words and their own (conflict). A repeating work
 * item asks first which occurrences the change is for.
 */
export function useInlineEdit({ current, latest, send, isRepeating = false, onSaved }: {
  current: Written;
  latest: () => Promise<Latest>;
  /** Sends what changed over the version given; files uploaded into the body travel in the body's own blocks. */
  send: (changes: Partial<Written>, version: number, scope?: Scope) => Promise<unknown>;
  isRepeating?: boolean;
  onSaved?: () => void;
}) {
  const [opened, setOpened] = useState<Written>(current);
  const [draft, setDraft] = useState<Written>(current);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<{ latest: Latest; scope?: Scope } | null>(null);
  const [isAskingScope, setAskingScope] = useState(false);
  // Counts the times the words were replaced from outside (undone, the latest taken, an agent's edit followed), so a
  // body editor keyed by it starts over with them even while it has the focus.
  const [revision, setRevision] = useState(0);
  const replace = (words: Written) => { setOpened(words); setDraft(words); setRevision(count => count + 1); };
  const isChanged = draft.title !== opened.title || draft.body !== opened.body;
  // Nothing changed: the draft follows the server's copy (a save, an agent's edit, a reload).
  useEffect(() => {
    if (isChanged || (current.title === draft.title && current.body === draft.body)) return;
    replace(current);
  }, [current.title, current.body]);

  const changesFrom = (base: Written) => ({
    ...(draft.title.trim() !== base.title ? { title: draft.title.trim() } : {}),
    ...(draft.body !== base.body ? { body: draft.body } : {}),
  });
  const commit = async (version: number, base: Written, scope?: Scope) => {
    await send(changesFrom(base), version, scope);
    // As the server keeps them: the title and body without the spaces around them.
    const saved = { title: draft.title.trim(), body: draft.body.trim() };
    setOpened(saved); setDraft(saved); setConflict(null); setError('');
    onSaved?.();
  };
  const save = useCallback(async (scope?: Scope) => {
    if (!isChanged || isBusy) return;
    if (!draft.title.trim()) { setError('제목을 입력해 주세요.'); return; }
    if (isRepeating && !scope) { setAskingScope(true); return; }
    setAskingScope(false); setBusy(true); setError('');
    try {
      const fresh = await latest();
      if (fresh.title !== opened.title || fresh.body !== opened.body) { setConflict({ latest: fresh, scope }); return; }
      await commit(fresh.version, opened, scope);
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  }, [isChanged, isBusy, draft, opened, isRepeating, latest]);

  return {
    draft, isChanged, isBusy, error, conflict, isAskingScope, revision,
    setTitle: (title: string) => setDraft(previous => ({ ...previous, title })),
    setBody: (body: string) => setDraft(previous => ({ ...previous, body })),
    save,
    /** 되돌리기: back to the copy the member started from. */
    undo: () => { replace(opened); setError(''); },
    cancelScope: () => setAskingScope(false),
    /** The latest words win: the member's draft is dropped for them. */
    takeLatest: () => { if (!conflict) return; const { title, body } = conflict.latest; replace({ title, body }); setConflict(null); },
    /** The member's words win over the latest version. */
    keepMine: async () => {
      if (!conflict) return;
      setBusy(true);
      try { await commit(conflict.latest.version, conflict.latest, conflict.scope); }
      catch (failure) { setError(authError(failure)); setConflict(null); }
      finally { setBusy(false); }
    },
  };
}
