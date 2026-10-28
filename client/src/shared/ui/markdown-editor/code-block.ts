import CodeBlock from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockView } from './CodeBlockView';

/** The code block drawn by CodeBlockView, so a ```mermaid block reads as its diagram (BIT-95). The Markdown is unchanged. */
export const DiagramCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
