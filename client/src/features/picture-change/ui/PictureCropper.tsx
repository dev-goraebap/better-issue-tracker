import { useState } from 'react';
import { Slider } from '@astryxdesign/core';
import Cropper, { type Area } from 'react-easy-crop';
import { cropPicture } from '../model/crop-picture';
import styles from './picture-change.module.css';

const MAX_ZOOM = 4;

/**
 * Places a photo under the frame the picture will show in (hohohr's PictureCropper): drag to move it, the slider, the
 * wheel or a pinch to enlarge it. The framed square is cut and shrunk here when the dialog saves (onCut), so only a
 * small JPEG leaves the browser.
 */
export function PictureCropper({ source, shape, isBusy, onArea }: {
  source: string; shape: 'round' | 'rect'; isBusy: boolean; onArea: (cut: (() => Promise<Blob>) | null) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // A frame measured before the dialog was laid out has no size; cutting it would make an empty, white picture.
  const settle = (area: Area) => onArea(area.width >= 1 && area.height >= 1 ? () => cropPicture(source, area) : null);
  return <div className={styles.cropper}>
    <div className={styles.cropArea}>
      <Cropper image={source} crop={crop} zoom={zoom} maxZoom={MAX_ZOOM} aspect={1} cropShape={shape} showGrid={false}
        onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => settle(pixels)} />
    </div>
    <Slider label="확대" value={zoom} min={1} max={MAX_ZOOM} step={0.05} onChange={(value: number) => setZoom(value)}
      formatValue={(value: number) => `${Math.round(value * 100)}%`} isDisabled={isBusy} />
  </div>;
}
