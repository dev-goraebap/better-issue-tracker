import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { NavIcon } from '@/shared/ui';
import { targetHref } from '@/entities/relation';
import { RelationPicker } from './RelationPicker';

/** The editor owns insertion and focus; this feature only searches readable documents and returns a stable URL. */
export function DocumentLinkButton({ workspaceId, onInsert }: { workspaceId: string; onInsert: (link: { href: string; title: string }) => void }) {
  const [open, setOpen] = useState(false);
  return <><Button label="문서 링크 삽입" icon={<NavIcon name="link" />} size="sm" variant="ghost" onClick={() => setOpen(true)} />
    {open && createPortal(<RelationPicker workspaceId={workspaceId} type="document" title="본문에 문서 링크 삽입" confirmLabel="삽입"
      onClose={() => setOpen(false)} onSelect={async item => { afterOverlayClose(() => onInsert({ href: targetHref(workspaceId, item), title: item.title })); }} />, document.body)}</>;
}
