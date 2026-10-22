import { Avatar, type AvatarProps } from '@astryxdesign/core';
import { derivedAvatar, drawnAvatarSource } from '@/shared/lib/drawn-avatars';
export function DefaultAvatar({ seed, name, size = 32 }: { seed: string; name?: string; size?: AvatarProps['size'] }) {
  return <Avatar name={name} src={drawnAvatarSource(derivedAvatar(seed))} size={size} tooltip={false} />;
}
