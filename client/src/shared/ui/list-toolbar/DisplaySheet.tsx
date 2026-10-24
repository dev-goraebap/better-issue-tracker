import { BottomSheet } from '@astryxdesign/core';
import { useId } from 'react';
import { FrameBody, FrameHead } from '../frame';
import type { ListSort } from '../sort-menu';
import { DisplayMenu } from './DisplayMenu';
import type { ListViews } from './ListToolbar';

/**
 * A phone's 표시 in a bottom sheet as tall as it is, the shared frame's head over the views and the order (DisplayMenu);
 * choosing applies at once and leaves the sheet open, the order's reset closes it.
 */
export function DisplaySheet({ views, sort, onClose }: { views?: ListViews; sort?: ListSort; onClose: () => void }) {
  const titleId = useId();
  return <BottomSheet isOpen onOpenChange={isOpen => { if (!isOpen) onClose(); }} label="표시" height="hug">
    <FrameHead title="표시" titleId={titleId} onClose={onClose} />
    <FrameBody><DisplayMenu views={views} sort={sort} size="lg" onDone={onClose} /></FrameBody>
  </BottomSheet>;
}
