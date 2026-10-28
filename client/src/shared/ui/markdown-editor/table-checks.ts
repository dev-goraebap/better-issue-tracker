import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** A table cell that holds only a box: [ ], [x] or [X]. */
const BOX = /^\[([ xX])\]$/;

/**
 * Boxes in table cells (BIT-95): Markdown has task boxes only in lists, so a checklist kept as a table (a 확인 column)
 * writes [ ] and [x] as plain text. Read, a cell holding only that shows the list's box instead, ticked for an x; the
 * Markdown stays as written. Written, the cell with the caret in it shows the text to change. Ticking it from the page
 * is BIT-97.
 */
export const TableChecks = Extension.create({
  name: 'tableChecks',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      props: {
        decorations: state => {
          const found: Decoration[] = [];
          const { from, to } = state.selection;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') return true;
            // Written, the cell with the caret in it shows its text to be changed (BIT-99).
            if (editor.isEditable && from > pos && to < pos + node.nodeSize) return false;
            const line = node.firstChild;
            const match = node.childCount === 1 && line ? BOX.exec(line.textContent.trim()) : null;
            if (match && line) {
              const isChecked = match[1] !== ' ';
              found.push(Decoration.node(pos + 1, pos + 1 + line.nodeSize, {
                class: 'bit-cell-check', 'data-checked': String(isChecked), role: 'img', 'aria-label': isChecked ? '확인됨' : '확인 전',
              }));
            }
            return false;
          });
          return DecorationSet.create(state.doc, found);
        },
      },
    })];
  },
});
