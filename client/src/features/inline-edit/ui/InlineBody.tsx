import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import styles from './inline-edit.module.css';

/** What a press on the text as read does on its own: follow a link, open a picture, press a button, tick nothing. */
const OWN_PRESS = 'a, button, input, label, img, [role="button"], [data-language="mermaid"]';

/**
 * A detail's body read until it is pressed (D-107): reading keeps what writing hides (diagrams without their code,
 * alerts without their markers, boxes in table cells, pictures that open larger). A press on the words opens the editor
 * with the caret at that place in the text (found in the text as read, which is the same document), a press past the
 * words or on an empty body at its end; a press on a link, a picture or a button does its own thing, and selecting words
 * to copy opens nothing. The editor stays while the words differ from the saved ones (isKept) and closes when the member
 * leaves it unchanged, or when the words are replaced from outside (revision).
 */
export function InlineBody({ canOpen, isKept, revision, read, write }: {
  canOpen: boolean; isKept: boolean; revision: number; read: ReactNode;
  write: (startAt: number | undefined) => ReactNode;
}) {
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  useEffect(() => { setOpenedAt(null); }, [revision]);
  const isOpen = canOpen && (isKept || openedAt !== null);
  if (isOpen) return <div className={styles.body} onBlur={event => {
    if (!isKept && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenedAt(null);
  }}>{write(openedAt ?? undefined)}</div>;
  const open = (event: MouseEvent<HTMLDivElement>) => {
    if (!canOpen || (event.target as Element).closest(OWN_PRESS)) return;
    if (!window.getSelection()?.isCollapsed) return;
    const read = (event.target as Element).closest('.ProseMirror') as (Element & { editor?: Editor }) | null;
    const at = read?.editor?.view.posAtCoords({ left: event.clientX, top: event.clientY });
    setOpenedAt(at ? at.pos : -1);
  };
  return <div className={styles.body} data-openable={canOpen || undefined} onClick={open}>{read}</div>;
}
