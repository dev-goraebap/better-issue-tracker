import { useSyncExternalStore } from 'react';

/** A member's or workspace's picture as the server lists it (BIT-30): its id and the colour to paint its place with. */
export type Picture = { id: string; color?: string | null };

/** Where a member's picture is read; its id is in it, so a browser keeps the bytes for good. */
export const avatarUrl = (userId: string, picture: Picture) =>
  `/api/v1/users/${encodeURIComponent(userId)}/avatar/${encodeURIComponent(picture.id)}`;

/**
 * The members' pictures this page knows, by user id, so every avatar beside a name (DefaultAvatar, seeded with the
 * user's id) shows the photo wherever the members or the session were read. A member listed without one is forgotten,
 * so a removed picture goes back to the drawing.
 */
const pictures = new Map<string, Picture>();
const listeners = new Set<() => void>();

export function rememberPictures(entries: Iterable<readonly [string, Picture | null | undefined]>) {
  let changed = false;
  for (const [userId, picture] of entries) {
    const known = pictures.get(userId);
    if (picture ? known?.id === picture.id && known.color === picture.color : !known) continue;
    if (picture) pictures.set(userId, picture);
    else pictures.delete(userId);
    changed = true;
  }
  if (changed) listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** The member's picture, if one is known. */
export function usePersonPicture(userId: string): Picture | undefined {
  return useSyncExternalStore(subscribe, () => pictures.get(userId), () => undefined);
}
