import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';

/** One block a member can turn the line into from the slash menu: its name, words it is found by, its icon and what it does. */
export type SlashItem = { id: string; label: string; hint: string; keywords: string; icon: string; run: (editor: Editor, range: Range) => void };

/** The blocks of the slash menu, as Linear's and Plane's: text, three headings, the lists, a quote, code and a rule. */
export const SLASH_ITEMS: readonly SlashItem[] = [
  { id: 'text', label: '텍스트', hint: '그냥 문단', keywords: 'text paragraph 텍스트 문단 본문', icon: 'type', run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { id: 'h1', label: '제목 1', hint: '#', keywords: 'h1 heading title 제목 큰제목', icon: 'heading-1', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { id: 'h2', label: '제목 2', hint: '##', keywords: 'h2 heading 제목 중간', icon: 'heading-2', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { id: 'h3', label: '제목 3', hint: '###', keywords: 'h3 heading 제목 작은', icon: 'heading-3', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { id: 'bullet', label: '글머리 목록', hint: '-', keywords: 'bullet list ul 목록 글머리', icon: 'list-bullet', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { id: 'ordered', label: '번호 목록', hint: '1.', keywords: 'ordered number list ol 번호 순서', icon: 'list-ordered', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { id: 'task', label: '할 일 목록', hint: '[ ]', keywords: 'todo task check 할일 체크 체크리스트', icon: 'list-todo', run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { id: 'quote', label: '인용', hint: '>', keywords: 'quote blockquote 인용', icon: 'quote', run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { id: 'code', label: '코드 블록', hint: '```', keywords: 'code block 코드', icon: 'square-code', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { id: 'rule', label: '구분선', hint: '---', keywords: 'divider hr rule line 구분선 선', icon: 'minus', run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
];

/** What the open slash menu shows: where it hangs, the blocks matching what was typed, the highlighted one. */
export type SlashState = { rect: DOMRect | null; items: readonly SlashItem[]; index: number; pick: (item: SlashItem) => void } | null;

/**
 * The slash menu's state outside React, one per editor: the editor's suggestion plugin writes it as the member types
 * after '/', and SlashMenu reads it (useSyncExternalStore) to draw the list.
 */
export class SlashStore {
  private state: SlashState = null;
  private listeners = new Set<() => void>();
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  readonly get = () => this.state;
  set(next: SlashState) { this.state = next; this.listeners.forEach(listener => listener()); }
}

const matching = (query: string) => {
  const words = query.trim().toLowerCase();
  return SLASH_ITEMS.filter(item => !words || item.label.toLowerCase().includes(words) || item.keywords.includes(words));
};

/**
 * '/' at the start of a line or after a space opens the block menu: the arrows walk it, Enter or a click turns the
 * line into that block, Escape closes it; typed letters narrow it ('/제목', '/todo').
 */
export const SlashCommand = Extension.create<{ store: SlashStore }>({
  name: 'slashCommand',
  addOptions() { return { store: new SlashStore() }; },
  addProseMirrorPlugins() {
    const store = this.options.store;
    let current: SuggestionProps<SlashItem, SlashItem> | null = null;
    let index = 0;
    const key = new PluginKey('slashCommand');
    const publish = () => {
      if (!current) { store.set(null); return; }
      const props = current;
      store.set({ rect: props.clientRect?.() ?? null, items: props.items, index, pick: item => props.command(item) });
    };
    return [Suggestion<SlashItem, SlashItem>({
      editor: this.editor,
      pluginKey: key,
      char: '/',
      allowedPrefixes: [' '],
      items: ({ query }) => matching(query),
      command: ({ editor, range, props }) => props.run(editor, range),
      allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
      render: () => ({
        onStart: props => { current = props; index = 0; publish(); },
        onUpdate: props => { current = props; index = Math.min(index, Math.max(0, props.items.length - 1)); publish(); },
        onExit: () => { current = null; publish(); },
        onKeyDown: ({ event, view }: SuggestionKeyDownProps) => {
          if (!current || current.items.length === 0) return false;
          if (event.key === 'ArrowDown') { index = (index + 1) % current.items.length; publish(); return true; }
          if (event.key === 'ArrowUp') { index = (index - 1 + current.items.length) % current.items.length; publish(); return true; }
          if (event.key === 'Enter' || event.key === 'Tab') { current.command(current.items[index]!); return true; }
          if (event.key === 'Escape') { exitSuggestion(view, key); return true; }
          return false;
        },
      }),
    })];
  },
});
