import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { NavIcon } from '../NavIcon';
import { BLOCKS, MARKS } from './formatting';
import { LinkField } from './LinkField';
import styles from './markdown.module.css';

/**
 * A phone's formatting bar while the editor has the keyboard, as Linear's and Notion's: it rides on top of the keyboard
 * (the visual viewport's bottom) with the blocks a thumb cannot type quickly (제목, the lists, 할 일, 인용, 코드), the
 * marks, 링크 and undo. It scrolls sideways when the phone is narrow. A press keeps the keyboard up (no blur).
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const [inset, setInset] = useState(0);
  const [isLinking, setLinking] = useState(false);
  const on = useEditorState({ editor, selector: ({ editor: current }) => ({
    blocks: BLOCKS.map(block => block.isOn(current)), marks: MARKS.map(mark => mark.isOn(current)), link: current.isActive('link'),
    canUndo: current.can().undo(), canRedo: current.can().redo(),
  }) });
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const place = () => setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    place();
    viewport.addEventListener('resize', place);
    viewport.addEventListener('scroll', place);
    return () => { viewport.removeEventListener('resize', place); viewport.removeEventListener('scroll', place); };
  }, []);
  const tool = (id: string, icon: string, label: string, isOn: boolean, run: () => void, isDisabled = false) => <button key={id} type="button" className={styles.tool}
    aria-label={label} aria-pressed={isOn} disabled={isDisabled} onMouseDown={event => event.preventDefault()} onClick={run}><NavIcon name={icon} /></button>;
  return <div className={styles.toolbar} style={{ bottom: inset }} role="toolbar" aria-label="서식">
    {isLinking ? <LinkField editor={editor} onDone={() => setLinking(false)} /> : <>
      {BLOCKS.map((block, index) => tool(block.id, block.icon, block.label, on.blocks[index] ?? false, () => block.run(editor)))}
      <span className={styles.toolRule} aria-hidden="true" />
      {MARKS.map((mark, index) => tool(mark.id, mark.icon, mark.label, on.marks[index] ?? false, () => mark.run(editor)))}
      {tool('link', 'link', '링크', on.link, () => setLinking(true))}
      <span className={styles.toolRule} aria-hidden="true" />
      {tool('undo', 'undo', '되돌리기', false, () => editor.chain().focus().undo().run(), !on.canUndo)}
      {tool('redo', 'redo', '다시 하기', false, () => editor.chain().focus().redo().run(), !on.canRedo)}
    </>}
  </div>;
}
