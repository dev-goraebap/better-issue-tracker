import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useAppearance } from '@/shared/lib/appearance';
import { NavIcon } from '../NavIcon';
import { ZoomViewer } from '../zoom-viewer';
import { drawnDiagram, keepDiagram, renderMermaid } from './mermaid-render';
import styles from './markdown.module.css';

type Drawn = { svg: string; error?: undefined } | { svg?: undefined; error: string };

/**
 * The diagram's shape (width over height, from its viewBox), so the viewer can open it as large as the screen allows:
 * Mermaid draws it 100% wide, which is nothing in the viewer's box of no width.
 */
const ratioOf = (svg: string) => {
  const box = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  return box ? Number(box[1]) / Number(box[2]) : 2;
};

/**
 * A code block, and a ```mermaid one drawn as its diagram (BIT-95). Read, the diagram shows alone and opens over the
 * whole screen to zoom in; written, the code stays editable with the diagram drawn under it as it is typed. A diagram
 * Mermaid cannot read shows its code with the reason.
 */
export function CodeBlockView({ node, editor, getPos }: NodeViewProps) {
  const language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
  const isMermaid = language.toLowerCase() === 'mermaid';
  const code = node.textContent;
  const place = useRef<HTMLDivElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [editable, setEditable] = useState(editor.isEditable);
  const { mode, color } = useAppearance();
  // In the system's mode the diagram follows the system's light and dark too.
  const [isSystemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const look = `${mode}|${color}|${isSystemDark}|${code}`;
  const [drawn, setDrawn] = useState<Drawn | null>(() => { const svg = drawnDiagram(look); return svg ? { svg } : null; });
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  // Written, the code shows only while the caret is in this block, so the text reads as it does read (BIT-99).
  const [hasCaret, setCaret] = useState(false);
  useEffect(() => {
    const update = () => {
      setEditable(editor.isEditable);
      const at = getPos();
      const { from, to } = editor.state.selection;
      setCaret(typeof at === 'number' && from > at && to < at + node.nodeSize);
    };
    editor.on('update', update);
    editor.on('selectionUpdate', update);
    return () => { editor.off('update', update); editor.off('selectionUpdate', update); };
  }, [editor, getPos, node.nodeSize]);
  const writeCode = () => { const at = getPos(); if (typeof at === 'number') editor.chain().focus().setTextSelection(at + 1 + node.content.size).run(); };
  useEffect(() => {
    if (!isMermaid || !code.trim()) { setDrawn(null); return undefined; }
    const before = drawnDiagram(look);
    if (before) { setDrawn({ svg: before }); return undefined; }
    let isCurrent = true;
    // Written, the drawing waits for a pause in typing.
    const timer = window.setTimeout(() => {
      if (!place.current) return;
      renderMermaid(code, place.current)
        .then(svg => { keepDiagram(look, svg); if (isCurrent) setDrawn({ svg }); })
        .catch((failure: unknown) => { if (isCurrent) setDrawn({ error: failure instanceof Error ? failure.message.split('\n')[0]! : '다이어그램을 그리지 못했습니다' }); });
    }, editable ? 400 : 0);
    return () => { isCurrent = false; window.clearTimeout(timer); };
  }, [isMermaid, code, editable, mode, color, isSystemDark]);
  const showsCode = !isMermaid || (editable && hasCaret) || !!drawn?.error;
  return <NodeViewWrapper className={isMermaid ? styles.mermaidBlock : undefined} data-language={language || undefined}>
    {/* The code is always the node's content (ProseMirror keeps it there); a drawn diagram only hides it. */}
    <pre className={isMermaid ? styles.mermaidCode : undefined} hidden={!showsCode}><NodeViewContent<'code'> as="code" className={language ? `language-${language}` : undefined} /></pre>
    {isMermaid && <div ref={place} className={styles.mermaid} contentEditable={false}>
      {drawn?.svg && <>
        {/* The drawing itself opens it too; the button beside it is what a keyboard and a screen reader use. */}
        <div className={styles.mermaidOpen} aria-hidden="true" onClick={() => setOpen(true)} dangerouslySetInnerHTML={{ __html: drawn.svg }} />
        <span className={styles.mermaidTools}>
          {editable && !hasCaret && <button type="button" className={styles.mermaidZoom} aria-label="다이어그램 코드 고치기" title="코드 고치기" onClick={writeCode}><NavIcon name="code" /></button>}
          <button type="button" className={styles.mermaidZoom} aria-label="다이어그램 크게 보기" title="크게 보기" onClick={() => setOpen(true)}><NavIcon name="expand-page" /></button>
        </span>
      </>}
      {drawn?.error && <p className={styles.mermaidError} role="note">다이어그램을 그리지 못했습니다: {drawn.error}</p>}
      {!drawn && code.trim() && <p className={styles.mermaidWait}>다이어그램을 그리는 중…</p>}
    </div>}
    {isOpen && drawn?.svg && <ZoomViewer label="다이어그램" onClose={() => setOpen(false)}>
      <div className={styles.mermaidLarge} style={{ '--ratio': ratioOf(drawn.svg) } as CSSProperties} dangerouslySetInnerHTML={{ __html: drawn.svg }} />
    </ZoomViewer>}
  </NodeViewWrapper>;
}
