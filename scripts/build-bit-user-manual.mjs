import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'docs/manuals/bit-user');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const assets = {}; const images = new Map(); const pages = [];
for (const page of manifest.pages) {
  let body = await readFile(path.join(source, page.file), 'utf8');
  for (const match of [...body.matchAll(/\]\((images\/[A-Za-z0-9_-]+\.jpg)\)/g)]) {
    const name = match[1];
    if (!images.has(name)) {
      const id = `Image${String(images.size + 1).padStart(5, '0')}`;
      const bytes = await readFile(path.join(source, name));
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Not a JPEG: ${name}`);
      images.set(name, id); assets[id] = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    }
    body = body.replaceAll(`](${name})`, `](attachment:${images.get(name)})`);
  }
  if (/\]\(images\//.test(body)) throw new Error(`Unresolved image in ${page.file}`);
  pages.push({ id: page.id, title: page.title, sectionId: page.sectionId, body, updatedAt: '2026-10-31T00:00:00Z' });
}
const manual = { id: 'bit-user-manual', title: manifest.title, description: manifest.description, cover: manifest.cover, sections: manifest.sections, pages, assets, comments: [] };
const text = JSON.stringify({ format: 'bit-manual', version: 1, manual });
const bytes = Buffer.byteLength(text);
if (bytes > 4 * 1024 * 1024) throw new Error(`Manual exceeds import limit: ${bytes}`);
const output = path.resolve(root, process.argv[2] || '.tmp/bit-user-manual.bit-manual.json');
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, text);
console.log(JSON.stringify({ output, sections: manual.sections.length, pages: pages.length, images: images.size, bytes }));
