import { Extension } from '@tiptap/core';
import type { Node as ProseNode } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** GitHub's five alerts, each its Korean title and its lucide icon's strokes (24px box). */
const ALERTS: Record<string, { title: string; paths: string[] }> = {
  note: { title: '참고', paths: ['M12 16v-4', 'M12 8h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'] },
  tip: { title: '팁', paths: ['M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5', 'M9 18h6', 'M10 22h4'] },
  important: { title: '중요', paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M12 7v2', 'M12 13h.01'] },
  warning: { title: '경고', paths: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'] },
  caution: { title: '주의', paths: ['M12 16h.01', 'M12 8v4',
    'M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z'] },
};
/** '[!NOTE]' and its kin at the very start of a quote's first line. */
const MARKER = /^\[!(note|tip|important|warning|caution)\][^\S\n]*/i;

function title(kind: string) {
  const { title: words, paths } = ALERTS[kind]!;
  const head = document.createElement('div');
  head.className = 'bit-alert-title';
  head.contentEditable = 'false';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }))
    svg.setAttribute(name, value);
  for (const d of paths) { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); svg.append(path); }
  const label = document.createElement('span');
  label.textContent = words;
  head.append(svg, label);
  return head;
}

/**
 * The decorations that turn one quote into an alert, or none when its first line is no alert's marker. showsMarker is
 * true while the caret is in this quote of an editor: only then the marker shows, so text written reads as read
 * (BIT-99) and still lets the marker be changed.
 */
function decorate(quote: ProseNode, pos: number, showsMarker: boolean): Decoration[] {
  const line = quote.firstChild;
  const first = line?.firstChild;
  if (!line?.isTextblock || !first?.isText) return [];
  const match = MARKER.exec(first.text ?? '');
  if (!match) return [];
  const kind = match[1]!.toLowerCase();
  const start = pos + 2;
  let end = start + match[0].length;
  // The line break after the marker goes with it: a newline in the text, or a hard break next to it.
  if (first.text!.charAt(match[0].length) === '\n') end += 1;
  else if (first.text!.length === match[0].length && line.childCount > 1 && line.child(1).type.name === 'hardBreak') end += 1;
  const markerOnly = first.text!.slice(match[0].length).trim() === '' && line.childCount === 1;
  return [
    Decoration.node(pos, pos + quote.nodeSize, { 'data-alert': kind }),
    Decoration.widget(pos + 1, () => title(kind), { side: -1, ignoreSelection: true, key: `alert-${kind}` }),
    // Read (or written elsewhere), the marker goes; with the caret in the quote it shows in a quiet mono to be changed.
    markerOnly && !showsMarker
      ? Decoration.node(pos + 1, pos + 1 + line.nodeSize, { class: 'bit-alert-marker-line' })
      : Decoration.inline(start, end, { class: showsMarker ? 'bit-alert-marker' : 'bit-alert-marker bit-alert-marker-hidden' }),
  ];
}

/**
 * GitHub's alerts (BIT-95): a quote whose first line starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or
 * [!CAUTION] reads as a tinted box with its icon and title (참고, 팁, 중요, 경고, 주의). Only how it is drawn changes;
 * the Markdown stays the quote with its marker, as GitHub, Obsidian and agents write it.
 */
export const Alerts = Extension.create({
  name: 'alerts',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      props: {
        decorations: state => {
          const found: Decoration[] = [];
          const { from, to } = state.selection;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'blockquote') found.push(...decorate(node, pos, editor.isEditable && from > pos && to < pos + node.nodeSize));
            return node.isBlock;
          });
          return DecorationSet.create(state.doc, found);
        },
      },
    })];
  },
});
