import { Extension, InputRule, type AnyExtension } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { Plugin } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Attachment } from './attachment-extension';
import { SlashCommand, type SlashStore } from './slash';

/** Text that reads as Markdown when pasted: a heading, a list, a task, a quote, a fence, a rule, a table row, a link. */
const MARKDOWN_SIGNS = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|---|\|.+\|)|\[[ xX]\]\s|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`/m;

/**
 * Plain text pasted that reads as Markdown (a note from an editor, a chat, a README) becomes the blocks it describes, as
 * Linear does. Rich text (copied from a page or a document) keeps its own formatting; inside a code block nothing changes.
 */
const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      props: {
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain') ?? '';
          const html = event.clipboardData?.getData('text/html') ?? '';
          if (!text || html || view.state.selection.$from.parent.type.spec.code || !MARKDOWN_SIGNS.test(text)) return false;
          return editor.commands.insertContent(text, { contentType: 'markdown' });
        },
      },
    })];
  },
});

/**
 * '- [ ] ' as Markdown is written: '- ' has already made a bullet, so '[ ] ' (or '[x] ') at the start of its item turns
 * the list into a task list, the box checked for an x; at the start of a task it sets that task's box. ('[ ] ' on a
 * line of its own is the task item's own rule.)
 */
const BulletToTask = Extension.create({
  name: 'bulletToTask',
  addInputRules() {
    return [new InputRule({
      find: /^\[( |x|X)?\]\s$/,
      handler: ({ state, range, match, chain }) => {
        const $from = state.doc.resolve(range.from);
        const checked = /x/i.test(match[1] ?? '');
        const item = $from.depth < 2 ? '' : $from.node(-1).type.name;
        // Already a task (the line after one): the box is what was typed.
        if (item === 'taskItem') { chain().deleteRange(range).updateAttributes('taskItem', { checked }).run(); return; }
        if (item !== 'listItem' || $from.node(-2).type.name !== 'bulletList') return null;
        chain().deleteRange(range).toggleTaskList().updateAttributes('taskItem', { checked }).run();
      },
    })];
  },
});

/**
 * Ctrl (⌘) + Enter hands the text to the editor's owner (a comment sends) and never breaks the line, as the hard break
 * would: a form around the editor (a new work item) takes the key from its own keydown.
 */
const SubmitShortcut = Extension.create<{ onSubmit?: () => void }>({
  name: 'submitShortcut',
  priority: 1000,
  addOptions() { return { onSubmit: undefined }; },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => { this.options.onSubmit?.(); return true; } };
  },
});

/** A task's box, named in Korean for screen readers: what the task is and whether it is done. */
const Task = TaskItem.configure({
  nested: true,
  a11y: { checkboxLabel: (node, checked) => `${node.textContent || '빈 할 일'} ${checked ? '완료됨' : '완료 표시'}` },
});

/**
 * The blocks and marks BIT writes, all of which Markdown keeps (D-076): paragraphs, three headings, bold, italic, strike,
 * inline code, links, the three kinds of list (a task list with its boxes), quotes, code blocks and rules. Underline
 * stays out, Markdown having none. Text comes in and goes out as Markdown, so the stored description stays readable to
 * agents and API clients.
 */
export function readingExtensions(attachmentUrl?: (id: string) => string): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      underline: false,
      link: { openOnClick: true, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
    }),
    Attachment.configure({ attachmentUrl }),
    TaskList,
    Task,
    Markdown.configure({ indentation: { style: 'space', size: 2 } }),
  ];
}

/** The editing set: the reading set with the slash menu, Markdown paste, '- [ ] ', the placeholder and the send shortcut. */
export function writingExtensions({ placeholder, store, onSubmit, attachmentUrl }: { placeholder: string; store: SlashStore; onSubmit?: () => void; attachmentUrl?: (id: string) => string }): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      underline: false,
      link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
    }),
    Attachment.configure({ attachmentUrl }),
    TaskList,
    Task,
    Markdown.configure({ indentation: { style: 'space', size: 2 } }),
    Placeholder.configure({ placeholder, emptyNodeClass: 'is-empty', showOnlyCurrent: true }),
    MarkdownPaste,
    BulletToTask,
    SubmitShortcut.configure({ onSubmit }),
    SlashCommand.configure({ store }),
  ];
}
