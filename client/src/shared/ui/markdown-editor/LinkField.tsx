import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { NavIcon } from '../NavIcon';
import { linkHref } from './formatting';
import styles from './markdown.module.css';

/**
 * The link's address in place of the menu's buttons: the current one to change, Enter puts it on the selection (an empty
 * one takes the link off), Escape goes back. Unlink takes it off at once.
 */
export function LinkField({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [typed, setTyped] = useState((editor.getAttributes('link').href as string | undefined) ?? '');
  const apply = () => {
    const href = linkHref(typed);
    if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    else editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onDone();
  };
  return <span className={styles.linkField}>
    <input className={styles.linkInput} value={typed} placeholder="주소 붙여넣기" aria-label="링크 주소" autoFocus
      onChange={event => setTyped(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); apply(); }
        if (event.key === 'Escape') { event.preventDefault(); onDone(); editor.commands.focus(); }
      }} />
    {editor.isActive('link') && <button type="button" className={styles.tool} aria-label="링크 빼기" title="링크 빼기"
      onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onDone(); }}><NavIcon name="unlink" /></button>}
  </span>;
}
