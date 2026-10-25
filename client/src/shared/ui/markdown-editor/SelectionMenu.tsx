import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { NavIcon } from '../NavIcon';
import { MARKS } from './formatting';
import { LinkField } from './LinkField';
import styles from './markdown.module.css';

/**
 * A desktop's menu over selected text, as Linear's: 굵게, 기울임, 취소선, 코드, then 링크 (the address typed in place).
 * It hangs inside the editor's own box, so a modal's top layer keeps it clickable; inside a code block it stays away.
 */
export function SelectionMenu({ editor, container }: { editor: Editor; container: () => HTMLElement }) {
  const [isLinking, setLinking] = useState(false);
  const on = useEditorState({ editor, selector: ({ editor: current }) => ({
    marks: MARKS.map(mark => mark.isOn(current)), link: current.isActive('link'),
  }) });
  return <BubbleMenu editor={editor} appendTo={container} className={styles.bubble} options={{ placement: 'top', offset: 8 }}
    shouldShow={({ editor: current, state }) => current.isFocused && !state.selection.empty && !state.selection.$from.parent.type.spec.code || isLinking}>
    {isLinking ? <LinkField editor={editor} onDone={() => setLinking(false)} /> : <>
      {MARKS.map((mark, index) => <button key={mark.id} type="button" className={styles.tool} aria-label={mark.label} title={mark.label} aria-pressed={on.marks[index]}
        onClick={() => mark.run(editor)}><NavIcon name={mark.icon} /></button>)}
      <span className={styles.toolRule} aria-hidden="true" />
      <button type="button" className={styles.tool} aria-label="링크" title="링크" aria-pressed={on.link} onClick={() => setLinking(true)}><NavIcon name="link" /></button>
    </>}
  </BubbleMenu>;
}
