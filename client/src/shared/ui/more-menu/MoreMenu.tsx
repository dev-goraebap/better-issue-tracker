import type { ComponentProps } from 'react';
import { MoreMenu as AstryxMoreMenu } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import styles from './more-menu.module.css';

/** The shared overflow action: a visible round chip, with the same icon size as the adjacent edit action. */
export function MoreMenu({ size = 'sm', icon, ...props }: ComponentProps<typeof AstryxMoreMenu>) {
  return <span className={styles.wrap}><AstryxMoreMenu {...props} size={size} icon={icon ?? <NavIcon name="more" />} /></span>;
}
