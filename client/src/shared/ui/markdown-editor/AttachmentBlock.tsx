import { useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { NavIcon } from '../NavIcon';
import styles from './markdown.module.css';

/** A movable document block, not a separate attachment tray. Only the owner's URL resolver can open its bytes. */
export function AttachmentBlock({ node, editor, extension, getPos, selected }: NodeViewProps) {
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const update = () => setEditable(editor.isEditable);
    editor.on('update', update);
    update();
    return () => { editor.off('update', update); };
  }, [editor]);
  const options = extension.options as { attachmentUrl?: (id: string) => string };
  const href = options.attachmentUrl?.(String(node.attrs.id));
  const preview = typeof node.attrs.preview === 'string' && node.attrs.preview.startsWith('blob:') ? node.attrs.preview : undefined;
  const move = (direction: -1 | 1) => {
    const position = getPos(); if (typeof position !== 'number') return;
    const { state, view } = editor; const before = state.doc.resolve(position).nodeBefore;
    const after = state.doc.resolve(position + node.nodeSize).nodeAfter;
    const sibling = direction < 0 ? before : after; if (!sibling) return;
    const destination = direction < 0 ? position - sibling.nodeSize : position + sibling.nodeSize;
    const tr = state.tr.delete(position, position + node.nodeSize).insert(destination, node);
    tr.setSelection(NodeSelection.create(tr.doc, destination)); view.dispatch(tr); view.focus();
  };
  return <NodeViewWrapper className={styles.attachmentBlock} data-selected={editable && selected || undefined} data-attachment-id={node.attrs.id}>
    {editable && <div className={styles.blockControls} contentEditable={false}>
      <button type="button" draggable data-drag-handle aria-label={`${node.attrs.filename} 블록 끌기`} title="끌어서 이동 · Alt+↑/↓" onKeyDown={event => {
        if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) { event.preventDefault(); move(event.key === 'ArrowUp' ? -1 : 1); }
      }}><NavIcon name="grip" /></button>
      <button type="button" aria-label={`${node.attrs.filename} 위로 이동`} onClick={() => move(-1)}><NavIcon name="send" /></button>
      <button type="button" aria-label={`${node.attrs.filename} 아래로 이동`} onClick={() => move(1)}><NavIcon name="chevron-down" /></button>
    </div>}
    <div className={styles.blockContent} contentEditable={false}>
      {node.attrs.image && (preview || href) && <img className={styles.attachmentImage} src={preview ?? href} alt={String(node.attrs.filename)} draggable={false} loading="lazy" />}
      <a className={styles.attachmentLink} href={href} target="_blank" rel="noreferrer" onClick={event => { if (!href || editable) event.preventDefault(); }}>
        <NavIcon name={node.attrs.image ? 'image' : 'file'} /><span>{String(node.attrs.filename)}</span>{href && <NavIcon name="download" />}
      </a>
    </div>
  </NodeViewWrapper>;
}
