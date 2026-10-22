import { readFile, mkdir, writeFile } from 'node:fs/promises';
const symbol = await readFile(new URL('../src/shared/ui/brand/bit-symbol.svg', import.meta.url), 'utf8');
const favicon = symbol.replace('fill="currentColor"', 'fill="#25252A"').replace('<path fill-rule', '<rect width="32" height="32" rx="6" fill="#F3F3F5"/><path fill-rule');
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/favicon.svg', import.meta.url), favicon);
console.log('BIT favicon generated from the SVG symbol.');
