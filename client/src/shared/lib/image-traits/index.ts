/** What an upload tells about a picture so screens can hold its place: its main colour and its size in pixels. */
export type ImageTraits = { dominantColor?: string; width?: number; height?: number };

/** The side the picture is shrunk to before its colour is read; enough for the colour, cheap for the browser. */
const SAMPLE = 96;
/**
 * How long one picture may take to measure. A browser does not decode while the page is hidden, so decode() can wait
 * until the tab comes back; past this the picture goes up without its traits.
 */
export const MEASURE_TIMEOUT_MS = 3000;
const PICTURE = /^image\/(png|jpeg|webp|gif)$/;
const measured = new WeakMap<Blob, Promise<ImageTraits>>();
// One picture at a time, so choosing many photos does not decode them all at once.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Measures a picture before it is sent. A file that is not a picture, one the browser cannot read, or one that takes
 * longer than MEASURE_TIMEOUT_MS measures as nothing: the upload goes ahead and the screen paints a plain placeholder.
 * A picture that runs out of time frees the queue, so the ones after it are not held up.
 */
export function measureImage(file: Blob): Promise<ImageTraits> {
  if (!PICTURE.test(file.type)) return Promise.resolve({});
  const known = measured.get(file);
  if (known) return known;
  const result = queue.then(() => {
    const stop = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<ImageTraits>(resolve => {
      timer = setTimeout(() => {
        stop.abort();
        resolve({});
      }, MEASURE_TIMEOUT_MS);
    });
    return Promise.race([measure(file, stop.signal), late]).finally(() => clearTimeout(timer));
  });
  queue = result;
  measured.set(file, result);
  return result;
}

async function measure(file: Blob, signal: AbortSignal): Promise<ImageTraits> {
  const traits: ImageTraits = {};
  const url = URL.createObjectURL(file);
  const image = new Image();
  // Dropping the source makes a pending decode() reject, so a picture that ran out of time lets its memory go.
  const release = () => {
    image.src = '';
    URL.revokeObjectURL(url);
  };
  signal.addEventListener('abort', release, { once: true });
  try {
    image.src = url;
    await image.decode();
    if (signal.aborted) return {};
    traits.width = image.naturalWidth;
    traits.height = image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    canvas.getContext('2d')?.drawImage(image, 0, 0, SAMPLE, SAMPLE);
    const { getColorSync } = await import('colorthief');
    traits.dominantColor = getColorSync(canvas)?.hex();
  } catch {
    // A picture that cannot be measured is still sent as it is.
  } finally {
    signal.removeEventListener('abort', release);
    if (!signal.aborted) release();
  }
  return traits;
}

/** Pictures this page has already shown, by address: they come back at once. */
const arrived = new Set<string>();
/** Notes that a picture has arrived, so it shows at once wherever it appears again. */
export function noteImageArrived(src: string) {
  arrived.add(src);
}
/**
 * Whether a picture is at hand without waiting: shown before on this page, or already in the browser's cache. A screen
 * shows such a picture at once and fades in only one it has to fetch.
 */
export function isImageAtHand(src: string | undefined): boolean {
  if (!src) return false;
  if (arrived.has(src)) return true;
  if (typeof Image === 'undefined') return false;
  const probe = new Image();
  probe.src = src;
  return probe.complete && probe.naturalWidth > 0;
}
