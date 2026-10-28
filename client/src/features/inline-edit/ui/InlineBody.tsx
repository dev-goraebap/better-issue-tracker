import type { MouseEvent, ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import styles from './inline-edit.module.css';

/** What a press on the text as read does on its own: follow a link, open a picture, press a button, tick nothing. */
const OWN_PRESS = 'a, button, input, label, img, [role="button"], [data-language="mermaid"]';

/**
 * A detail's body, read until the member asks to write it (D-109): reading keeps what writing hides (diagrams without
 * their code, alerts without their markers, boxes in table cells, pictures that open larger). A press on the words asks
 * for the hint (onPress); two presses open the editor with the caret at that place in the text (found in the text as
 * read, which is the same document), past the words or on an empty body at its end. A press on a link, a picture or a
 * button does its own thing, and selecting words to copy asks nothing. While writing, the editor is shown with the
 * caret where it was asked (startAt).
 */
export function InlineBody({ canOpen, isEditing, startAt, read, write, onPress, onOpen }: {
  canOpen: boolean; isEditing: boolean; startAt: number | undefined; read: ReactNode;
  write: (startAt: number | undefined) => ReactNode;
  onPress: () => void; onOpen: (startAt: number) => void;
}) {
  if (isEditing) return <div className={styles.body}>{write(startAt)}</div>;
  const isOwn = (event: MouseEvent<HTMLDivElement>) => !canOpen || !!(event.target as Element).closest(OWN_PRESS);
  const press = (event: MouseEvent<HTMLDivElement>) => {
    if (isOwn(event) || !window.getSelection()?.isCollapsed) return;
    onPress();
  };
  const open = (event: MouseEvent<HTMLDivElement>) => {
    if (isOwn(event)) return;
    const read = (event.target as Element).closest('.ProseMirror') as (Element & { editor?: Editor }) | null;
    const at = read?.editor?.view.posAtCoords({ left: event.clientX, top: event.clientY });
    window.getSelection()?.removeAllRanges();
    onOpen(at ? at.pos : -1);
  };
  return <div className={styles.body} data-openable={canOpen || undefined} onClick={press} onDoubleClick={open}>{read}</div>;
}
