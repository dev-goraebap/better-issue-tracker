import { BottomSheet } from '@astryxdesign/core';
import { useId } from 'react';
import { FrameBody, FrameHead } from '../frame';
import { ListSortMenu, type ListSort } from '../sort-menu';

/**
 * A phone's order in a bottom sheet as tall as it is, the shared frame's head over the sort menu (key and way); choosing
 * applies at once and leaves the sheet open for the other half, the reset closes it.
 */
export function SortSheet({ sort, onClose }: { sort: ListSort; onClose: () => void }) {
  const titleId = useId();
  return <BottomSheet isOpen onOpenChange={isOpen => { if (!isOpen) onClose(); }} label="정렬" height="hug">
    <FrameHead title="정렬" titleId={titleId} onClose={onClose} />
    <FrameBody><ListSortMenu sort={sort} size="lg" onDone={onClose} /></FrameBody>
  </BottomSheet>;
}
