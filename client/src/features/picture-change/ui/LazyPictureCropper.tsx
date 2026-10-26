import { lazy } from 'react';

/** The cropper and its library load only when a photo is picked. */
export const LazyPictureCropper = lazy(() => import('./PictureCropper').then(module => ({ default: module.PictureCropper })));
