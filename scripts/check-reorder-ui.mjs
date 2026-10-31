#!/usr/bin/env node
// A focused guard for the recurring arrow-only ordering regression; behavior still needs browser verification.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../client/src', import.meta.url)));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [join(dir, entry.name)] : []);
const failures = [];
for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  const arrows = /(?:aria-label|label)=[^\n]*(?:위로|아래로)/.test(source);
  const drag = /useRowReorder|useBoardMove|draggable|onPointerDown|onDragStart/.test(source);
  if (arrows && !drag) failures.push(`${relative(root, file)}: 위·아래 이동 버튼만으로 순서를 바꾸지 마세요. 공통 드래그 정렬과 키보드 대안을 함께 제공하세요.`);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('순서 변경 UI의 드래그 대안 검사를 통과했습니다.');
