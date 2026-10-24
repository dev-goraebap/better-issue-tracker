/**
 * The player and the drawing (Rocket in Space by Steven Monson after Ilya Pavlov, LottieFiles, Lottie Simple License,
 * notice in public/licenses), asked for when this module loads so they are in hand before a loader is due: it shows
 * 100ms into a wait at the earliest. lottie_light draws SVG without eval, so no script policy has to change.
 */
export const drawing = Promise.all([import('lottie-web/build/player/lottie_light'), import('./rocket-loader.json')])
  .then(([player, data]) => ({ player: player.default, data: data.default }));
