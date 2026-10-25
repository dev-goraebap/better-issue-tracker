import type { Editor } from '@tiptap/core';

/** One formatting control: its icon, name (and shortcut), whether it is on where the caret is, and what it does. */
export type Format = { id: string; icon: string; label: string; isOn: (editor: Editor) => boolean; run: (editor: Editor) => void };

const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

/** The marks a selection takes, in Linear's order; the selection menu and the phone's toolbar both show them. */
export const MARKS: readonly Format[] = [
  { id: 'bold', icon: 'bold', label: `굵게 (${mod}+B)`, isOn: e => e.isActive('bold'), run: e => e.chain().focus().toggleBold().run() },
  { id: 'italic', icon: 'italic', label: `기울임 (${mod}+I)`, isOn: e => e.isActive('italic'), run: e => e.chain().focus().toggleItalic().run() },
  { id: 'strike', icon: 'strike', label: `취소선 (${mod}+Shift+S)`, isOn: e => e.isActive('strike'), run: e => e.chain().focus().toggleStrike().run() },
  { id: 'code', icon: 'code', label: `코드 (${mod}+E)`, isOn: e => e.isActive('code'), run: e => e.chain().focus().toggleCode().run() },
];

/** The blocks the phone's toolbar turns a line into (a desktop types them: '## ', '- ', '[ ] ', or picks them after '/'). */
export const BLOCKS: readonly Format[] = [
  { id: 'heading', icon: 'heading-2', label: '제목', isOn: e => e.isActive('heading'), run: e => {
    const level = e.getAttributes('heading').level as number | undefined;
    if (level === 2) e.chain().focus().setHeading({ level: 3 }).run();
    else if (level === 3) e.chain().focus().setParagraph().run();
    else e.chain().focus().setHeading({ level: 2 }).run();
  } },
  { id: 'bullet', icon: 'list-bullet', label: '글머리 목록', isOn: e => e.isActive('bulletList'), run: e => e.chain().focus().toggleBulletList().run() },
  { id: 'ordered', icon: 'list-ordered', label: '번호 목록', isOn: e => e.isActive('orderedList'), run: e => e.chain().focus().toggleOrderedList().run() },
  { id: 'task', icon: 'list-todo', label: '할 일 목록', isOn: e => e.isActive('taskList'), run: e => e.chain().focus().toggleTaskList().run() },
  { id: 'quote', icon: 'quote', label: '인용', isOn: e => e.isActive('blockquote'), run: e => e.chain().focus().toggleBlockquote().run() },
  { id: 'codeBlock', icon: 'square-code', label: '코드 블록', isOn: e => e.isActive('codeBlock'), run: e => e.chain().focus().toggleCodeBlock().run() },
];

/** A link's address as typed: one without a scheme is taken as https (example.com → https://example.com). */
export const linkHref = (typed: string) => {
  const text = typed.trim();
  if (!text) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('/') || text.startsWith('#') ? text : `https://${text}`;
};
