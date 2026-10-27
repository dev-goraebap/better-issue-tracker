import { MarkdownView } from '@/shared/ui';
import { fileHref, type DetailTarget } from '../api/engagement';

export function AttachmentBody({ target, value, empty }: { target: DetailTarget; value: string; empty?: string }) {
  return <MarkdownView key={`${target.type}:${target.id}`} value={value} empty={empty} attachmentUrl={id => fileHref(target, id, false)} />;
}
