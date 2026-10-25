#!/usr/bin/env node
// Sets BIT's version everywhere it is written, so a release tag and the build agree (D-082): the client's
// package.json and the root entries of its package-lock.json (the screens show it), and the server's build.gradle.
// Usage: node scripts/set-version.mjs 0.8.0   (a plain semver; the tag adds the v and any -rc.N)
// Prints each file it changed, or that every file already had the version.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('버전을 0.8.0처럼 주세요 (v와 -rc 없이).');
  process.exit(1);
}
const root = resolve(import.meta.dirname, '..');
const changed = [];

/** Rewrites a file through edit, keeping its line endings, and notes it when its text changed. */
function update(path, edit) {
  const file = join(root, path);
  const before = readFileSync(file, 'utf8');
  const after = edit(before);
  if (after === before) return;
  writeFileSync(file, after);
  changed.push(path);
}

// The package's own version is the first "version" in package.json, and the first two in the lock (the lock's top
// and its "" package); dependency versions come after them.
const firstVersions = count => text => {
  let left = count;
  return text.replace(/("version":\s*")[^"]*(")/g, (match, open, close) => (left-- > 0 ? `${open}${version}${close}` : match));
};
update('client/package.json', firstVersions(1));
update('client/package-lock.json', firstVersions(2));
update('server/build.gradle', text => text.replace(/^version = '[^']*'/m, `version = '${version}'`));

console.log(changed.length ? `바꾼 파일: ${changed.join(', ')}` : `모든 파일이 이미 ${version}입니다.`);
