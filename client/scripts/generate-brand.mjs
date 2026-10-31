import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// One vector source supplies the themed UI mask and every opaque browser/app icon.
const symbol = await readFile(new URL('../src/shared/ui/brand/bit-symbol.svg', import.meta.url), 'utf8');
const publicRoot = new URL('../public/', import.meta.url);
const shapes = symbol.slice(symbol.indexOf('>') + 1, symbol.lastIndexOf('</svg>'));
// Match the approved Stone icon artwork, including its full square background.
const render = (maskable = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="#25252A"><rect width="1000" height="1000" fill="#F3F3F5"/>${maskable ? `<g transform="translate(50 50) scale(.9)">${shapes}</g>` : shapes}</svg>`;
const artwork = render();
// The approved inset keeps the whole symbol within the central 80% safe circle.
const maskableArtwork = render(true);
await mkdir(publicRoot, { recursive: true });
await writeFile(new URL('favicon.svg', publicRoot), artwork.replace('><rect', '>\n<rect') + '\n');

for (const [name, size] of [
  ['favicon-16.png', 16], ['favicon-32.png', 32], ['favicon-64.png', 64],
  ['icon-apple-touch.png', 180], ['apple-touch-icon.png', 180], ['icon-192.png', 192],
  ['icon-512.png', 512], ['icon-maskable-512.png', 512],
]) {
  await sharp(Buffer.from(name.startsWith('icon-maskable') ? maskableArtwork : artwork)).resize(size, size)
    .removeAlpha().png().toFile(fileURLToPath(new URL(name, publicRoot)));
}

// PNG-backed ICO entries keep the conventional /favicon.ico fallback in sync too.
const sizes = [16, 32, 64];
const frames = await Promise.all(sizes.map(size => readFile(new URL(`favicon-${size}.png`, publicRoot))));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL('favicon.ico', publicRoot), Buffer.concat([directory, ...frames]));

await writeFile(new URL('manifest.webmanifest', publicRoot), JSON.stringify({
  name: 'BIT · Better Issue Tracker', short_name: 'BIT', lang: 'ko',
  start_url: '/', scope: '/', display: 'standalone',
  background_color: '#F3F3F5', theme_color: '#F3F3F5',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');
console.log('BIT logo, browser icons, Apple touch icon and web app icons generated.');
