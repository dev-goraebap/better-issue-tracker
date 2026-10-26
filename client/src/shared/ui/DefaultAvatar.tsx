import { useMemo, useState } from 'react';
import { Avatar, type AvatarProps } from '@astryxdesign/core';
import { derivedAvatar, drawnAvatarSource } from '@/shared/lib/drawn-avatars';
import { isImageAtHand, noteImageArrived } from '@/shared/lib/image-traits';
import { avatarUrl, usePersonPicture } from '@/shared/lib/person-pictures';
import styles from './default-avatar.module.css';

/**
 * A member beside their name, seeded with their user id: their picture when they have one (BIT-30), else the drawing
 * derived from the id. A picture fades in over its main colour, unless it is at hand already and shows at once; one
 * that fails shows the drawing.
 */
export function DefaultAvatar({ seed, name, size = 32 }: { seed: string; name?: string; size?: AvatarProps['size'] }) {
  const picture = usePersonPicture(seed);
  const drawn = drawnAvatarSource(derivedAvatar(seed));
  const src = picture ? avatarUrl(seed, picture) : undefined;
  const [loaded, setLoaded] = useState<string>();
  const isAtOnce = useMemo(() => isImageAtHand(src), [src]);
  if (!src) return <Avatar name={name} src={drawn} size={size} tooltip={false} />;
  const place = picture?.color ? { backgroundColor: picture.color } : { backgroundImage: `url("${drawn}")`, backgroundSize: 'cover' };
  return <span className={styles.frame} data-picture data-shown={isAtOnce || loaded === src || undefined} data-at-once={isAtOnce || undefined}>
    {/* A new picture gets an image of its own, so the old one does not stand in for its fade. */}
    <Avatar key={src} name={name} src={src} fallbackSrc={drawn} size={size} tooltip={false} style={place}
      onLoadCapture={event => { if (event.target instanceof HTMLImageElement) { noteImageArrived(src); setLoaded(src); } }} />
  </span>;
}
