import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AttachmentBlock } from './AttachmentBlock';

/** Standard, portable Markdown: ![name](attachment:id) or [name](attachment:id) on its own line. */
export const Attachment = Node.create<{ attachmentUrl?: (id: string) => string }>({
  name: 'attachmentBlock', group: 'block', atom: true, draggable: true,
  addOptions() { return { attachmentUrl: undefined }; },
  addAttributes() { return { id: { default: '' }, filename: { default: '파일' }, image: { default: false }, preview: { default: null, rendered: false } }; },
  parseHTML() { return [{ tag: 'div[data-attachment-id]', getAttrs: element => ({ id: element.getAttribute('data-attachment-id'), filename: element.getAttribute('data-filename'), image: element.getAttribute('data-image') === 'true' }) }]; },
  renderHTML({ node }) { return ['div', { 'data-attachment-id': node.attrs.id, 'data-filename': node.attrs.filename, 'data-image': node.attrs.image }, String(node.attrs.filename)]; },
  addNodeView() { return ReactNodeViewRenderer(AttachmentBlock); },
  markdownTokenName: 'attachmentBlock',
  markdownTokenizer: {
    name: 'attachmentBlock', level: 'block',
    start: source => source.search(/^!?\[(?:\\.|[^\]])*\]\(attachment:[A-Za-z][A-Za-z0-9]{9}\)/m),
    tokenize(source) {
      const match = /^(!?)\[((?:\\.|[^\]])*)\]\(attachment:([A-Za-z][A-Za-z0-9]{9})\)[ \t]*(?:\n|$)/.exec(source);
      if (!match) return undefined;
      return { type: 'attachmentBlock', raw: match[0], id: match[3], filename: match[2]!.replace(/\\([\\\[\]])/g, '$1'), image: match[1] === '!' };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('attachmentBlock', { id: token.id, filename: token.filename, image: token.image }),
  renderMarkdown: node => `${node.attrs?.image ? '!' : ''}[${String(node.attrs?.filename ?? '파일').replace(/([\\\[\]])/g, '\\$1') }](attachment:${node.attrs?.id})`,
});
