/**
 * The drawn defaults: three hand-drawn faces on six backgrounds, numbered so that number % 3 is the face and
 * floor(number / 3) the background. The server keeps only the number a member chose.
 */
export const DRAWN_AVATARS = 18;

const backgrounds = ['#96a27b', '#f5dfa1', '#fac2a7', '#a8bbc5', '#b4c49f', '#c7bbd2'];
const faces = [
  `<path d="M28 92C18 72 29 38 52 34C60 32 71 32 79 36C99 45 109 75 101 92C95 105 37 106 28 92Z"/><path d="M63 34C69 29 70 24 68 21M66 34C73 32 77 29 78 25" fill="none"/><g fill="#193b30" stroke="none"><circle cx="47" cy="69" r="4"/><circle cx="80" cy="64" r="4"/></g><path d="M59 79Q65 84 71 78" fill="none"/>`,
  `<path d="M29 48Q29 29 48 29H75L99 53V86Q99 102 82 102H47Q28 102 28 84Z"/><path d="M75 30V45Q75 55 86 54H98" fill="none"/><ellipse cx="47" cy="67" rx="6" ry="7"/><ellipse cx="79" cy="67" rx="6" ry="7"/><g fill="#193b30" stroke="none"><ellipse cx="49" cy="67" rx="3" ry="5"/><ellipse cx="81" cy="67" rx="3" ry="5"/></g><path d="M61 83H65" fill="none"/>`,
  `<path d="M28 91C20 70 31 45 51 40Q64 36 78 41C98 48 107 72 101 91C95 105 37 105 28 91Z"/><path d="M62 38C43 34 39 24 40 19C53 19 62 26 62 38ZM68 37C68 23 79 15 90 16C88 29 80 35 68 37Z"/><g fill="#193b30" stroke="none"><circle cx="48" cy="69" r="4"/><circle cx="80" cy="69" r="4"/></g><path d="M59 82Q64 87 70 81" fill="none"/>`,
];

const sources = new Map<number, string>();

/** The drawn default of the given number as an image address; nothing leaves the browser to draw it. */
export function drawnAvatarSource(number: number): string {
  const known = sources.get(number);
  if (known) return known;
  const face = faces[number % faces.length];
  const background = backgrounds[Math.floor(number / faces.length) % backgrounds.length];
  const source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${background}"/><g fill="#fff4df" stroke="#193b30" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${face}</g></svg>`);
  sources.set(number, source);
  return source;
}

/** The default a member shows until they choose: a hash (FNV-1a) of their id picks it, the same on every screen. */
export function derivedAvatar(subjectId: string): number {
  let hash = 2166136261;
  for (const char of subjectId.toLowerCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % DRAWN_AVATARS;
}
