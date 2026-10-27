import { useEffect, useId, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { drawing } from './drawing';
import still from './rocket-still.svg?raw';
import styles from './page-loading.module.css';

/** How long the rocket keeps moving after its loader starts to fade (700ms), so it never freezes in sight. */
const FADE_OUT_MS = 450;
/** The frame shown when the rocket does not move: upright, among its stars. */
const STILL_FRAME = 0;
/** Where each showing starts. */
const START_FRAME = 0;

/**
 * A line-drawn rocket that plays while `isPlaying`, recolored to the theme by CSS; it holds one frame when motion is
 * reduced. Until the player arrives it shows that frame drawn in advance (the one index.html boots with), so the rocket
 * is there from the first moment and only starts to move when the player takes over.
 */
export function LoadingMark({ isSmall = false, isPlaying = true }: { isSmall?: boolean; isPlaying?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [animation, setAnimation] = useState<AnimationItem | null>(null);
  // The drawing's clip paths are named; each rocket on the page gets its own names.
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '') + '-';
  useEffect(() => {
    let item: AnimationItem | undefined; let gone = false;
    void drawing.then(({ player, data }) => {
      if (gone || !box.current) return;
      item = player.loadAnimation({ container: box.current, renderer: 'svg', loop: true, autoplay: false, animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      setAnimation(item);
    });
    return () => { gone = true; item?.destroy(); };
  }, []);
  useEffect(() => {
    if (!animation) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { animation.goToAndStop(STILL_FRAME, true); return; }
    // Each showing starts from the top of the loop, where the rocket already sways and the stars already drift, so even
    // the shortest showing (300ms) moves.
    if (isPlaying) { animation.setSpeed(1.2); animation.goToAndPlay(START_FRAME, true); return; }
    // It stops only once faded out: a rocket jumping to a still pose while it fades reads as a stutter.
    const timer = window.setTimeout(() => animation.pause(), FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [animation, isPlaying]);
  return <div className={isSmall ? `${styles.mark} ${styles.small}` : styles.mark} aria-hidden="true">
    {!animation && <div className={styles.frame} dangerouslySetInnerHTML={{ __html: still.replaceAll('rocket-still-', prefix) }} />}
    <div ref={box} className={styles.frame} />
  </div>;
}
