import {
  Code, GitMerge, GitPullRequestClosed, GitPullRequestDraft, Heading1, Heading2, Heading3, Bold, Italic, List, ListChecks, ListOrdered, Minus,
  Redo2, SquareCode, Strikethrough, TextQuote, Type, Undo2, Unlink, Webhook,
  type LucideIcon,
} from 'lucide-react';
import { SOLAR_ICONS } from './solar-icons';

// The icon set is Solar's Linear style (BIT-132, D-112), made from scripts/generate-icons.mjs; names follow SandboxHr's so its
// shared parts keep their calls. What Solar lacks is lucide's: the editor's toolbar whole, so its marks match one another,
// and the merge, webhook and draft and closed pull request marks.
const lucide: Record<string, LucideIcon> = {
  // The editor's blocks and marks (markdown-editor).
  type: Type,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  'list-bullet': List,
  'list-ordered': ListOrdered,
  'list-todo': ListChecks,
  quote: TextQuote,
  'square-code': SquareCode,
  minus: Minus,
  bold: Bold,
  italic: Italic,
  strike: Strikethrough,
  code: Code,
  undo: Undo2,
  redo: Redo2,
  unlink: Unlink,
  // Repository integrations (D-087).
  'pull-request-draft': GitPullRequestDraft,
  'pull-request-closed': GitPullRequestClosed,
  merge: GitMerge,
  webhook: Webhook,
};

/** A menu or action icon by name; an unknown name draws a plain file rather than nothing. */
export function NavIcon({ name, size = 'text' }: { name: string; size?: 'text' | 'navigation' | 'standalone' }) {
  const Icon = lucide[name];
  if (Icon) return <Icon className="bit-nav-icon" data-icon-size={size} size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
  return <svg className="bit-nav-icon" data-icon-set="solar" data-icon-size={size} width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    dangerouslySetInnerHTML={{ __html: SOLAR_ICONS[name] ?? SOLAR_ICONS.file ?? '' }} />;
}
