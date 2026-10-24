import { Text } from '@astryxdesign/core';
import { LoadingMark } from './LoadingMark';
import styles from './page-loading.module.css';

/**
 * The rocket over a screen being waited for. `window` covers the whole window on the first visit, when there is nothing
 * yet to show; otherwise it veils the content card, whose previous screen stays in view under it until the next is ready.
 */
export function PageLoader({ isVisible, place }: { isVisible: boolean; place: 'window' | 'card' }) {
  const className = [styles.overlay, place === 'window' ? styles.window : styles.veil, isVisible && styles.visible].filter(Boolean).join(' ');
  return <div className={className} {...(isVisible ? { role: 'status', 'aria-label': '화면을 불러오는 중' } : { 'aria-hidden': true })}>
    <LoadingMark isPlaying={isVisible} />
    <Text type="supporting" color="secondary">불러오는 중입니다</Text>
  </div>;
}
