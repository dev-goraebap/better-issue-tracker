import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { EditorContent, useEditor } from '@tiptap/react';
import { MOBILE_QUERY } from '@/shared/config';
import { EditorToolbar } from './EditorToolbar';
import { writingExtensions } from './extensions';
import { SelectionMenu } from './SelectionMenu';
import { SlashMenu } from './SlashMenu';
import { SlashStore } from './slash';
import styles from './markdown.module.css';

/** Markdown without the empty lines the editor keeps after the last block. */
const tidy = (markdown: string) => markdown.replace(/\s+$/, '');

/**
 * Writing rich text that is kept as Markdown (D-076), as Linear's and Plane's editors write (Plane's is Tiptap, the
 * ProseMirror toolkit this is built on). What is typed shows as it will read: '## ' makes a heading, '- ' a list, '[ ] '
 * a task, '```' code, '**' bold, and Markdown pasted as plain text becomes its blocks.
 *
 * - A desktop adds '/' for the block menu and a menu over selected text (marks, link); Ctrl (⌘) + Enter submits.
 * - A phone (the phone's width, as everywhere in the app) gets a formatting bar on top of the keyboard instead, the
 *   type at 16px so the page never zooms. The width decides, not the pointer: a touch-screen laptop reports only a
 *   coarse pointer and no hover, and is still a desktop.
 *
 * value is the Markdown; onChange gets it back on every change. A new value from outside (a template, the server's
 * copy after a save) replaces the text only while the member is not writing in it. variant 'bare' is text on the page
 * with no box (a description); 'field' sits in a hairline box (a comment).
 */
export function MarkdownEditor({ value, onChange, label, placeholder = '쓰기 시작하거나 / 로 블록을 고르세요…', variant = 'bare', autoFocus = false,
  isDisabled = false, minHeight, onSubmit, onBlur }: {
  value: string; onChange: (markdown: string) => void; label: string; placeholder?: string; variant?: 'bare' | 'field'; autoFocus?: boolean;
  isDisabled?: boolean; minHeight?: string; onSubmit?: () => void; onBlur?: () => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const box = useRef<HTMLDivElement>(null);
  const [store] = useState(() => new SlashStore());
  const [isWriting, setWriting] = useState(false);
  // The latest callbacks, read when the editor calls them (it is made once).
  const latest = useRef({ onChange, onSubmit, onBlur });
  useEffect(() => { latest.current = { onChange, onSubmit, onBlur }; });
  const editor = useEditor({
    extensions: writingExtensions({ placeholder, store, onSubmit: onSubmit ? () => latest.current.onSubmit?.() : undefined }),
    content: value,
    contentType: 'markdown',
    editable: !isDisabled,
    autofocus: autoFocus ? 'end' : false,
    editorProps: { attributes: { 'aria-label': label, 'aria-multiline': 'true', role: 'textbox', spellcheck: 'true' } },
    onUpdate: ({ editor: current }) => latest.current.onChange(tidy(current.getMarkdown())),
    onBlur: () => latest.current.onBlur?.(),
  });
  // A value from outside replaces the text while nobody is writing in it.
  useEffect(() => {
    if (!editor || editor.isFocused || tidy(editor.getMarkdown()) === tidy(value)) return;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!isDisabled); }, [editor, isDisabled]);
  const isTouch = isMobile;
  return <div ref={box} className={styles.editor} data-variant={variant} data-touch={isTouch || undefined} style={minHeight ? { ['--editor-min' as string]: minHeight } : undefined}
    onFocus={() => setWriting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setWriting(false); }}>
    <EditorContent editor={editor} className={styles.content} />
    {editor && !isTouch && <SelectionMenu editor={editor} container={() => box.current ?? document.body} />}
    {editor && <SlashMenu store={store} />}
    {editor && isTouch && isWriting && !isDisabled && <EditorToolbar editor={editor} />}
  </div>;
}
