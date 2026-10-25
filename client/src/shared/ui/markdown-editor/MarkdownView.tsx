import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { readingExtensions } from './extensions';
import styles from './markdown.module.css';

/**
 * Markdown read as it was written (D-076): headings, lists, tasks with their boxes, quotes, code and links, drawn by the
 * same schema the editor writes with, so a description reads the same whether one may change it or not. Links open in
 * a new tab. empty is what shows for no text.
 */
export function MarkdownView({ value, empty }: { value: string; empty?: string }) {
  const editor = useEditor({ extensions: readingExtensions(), content: value, contentType: 'markdown', editable: false });
  useEffect(() => {
    if (editor && editor.getMarkdown().trimEnd() !== value.trimEnd()) editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);
  if (!value.trim() && empty) return <p className={styles.empty}>{empty}</p>;
  return <div className={styles.view}><EditorContent editor={editor} className={styles.content} /></div>;
}
