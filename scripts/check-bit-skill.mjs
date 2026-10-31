#!/usr/bin/env node
// Checks the skill BIT ships (skills/better-issue-tracker) against this repository, so it cannot drift: every relative
// link resolves, every playbook and reference is reachable from SKILL.md, nothing points at the old numbered sections,
// and references/tools.md names exactly the MCP tools the server registers. CI runs it; exits 1 on any drift.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKILL = join(ROOT, 'skills', 'better-issue-tracker');
const SERVER = join(ROOT, 'server', 'src', 'main', 'java');
const problems = [];

const walk = (dir, keep) => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path, keep) : keep(path) ? [path] : [];
});
const docs = walk(SKILL, path => path.endsWith('.md'));
const show = path => relative(ROOT, path).replaceAll('\\', '/');

const linked = new Set();
for (const file of docs) {
  const text = readFileSync(file, 'utf8');
  for (const [, target] of text.matchAll(/\]\(([^)#\s:]+\.md)(?:#[^)]*)?\)/g)) {
    const path = resolve(dirname(file), target);
    if (!existsSync(path)) problems.push(`${show(file)}: link to ${target} does not resolve`);
    linked.add(path);
  }
  for (const [found] of text.matchAll(/\d절/g)) problems.push(`${show(file)}: "${found}" points at a numbered section; link the file instead`);
}
for (const file of docs.filter(path => /[\\/](playbooks|references)[\\/]/.test(path))) {
  if (!linked.has(file)) problems.push(`${show(file)}: no file links to it`);
}

const registered = new Set(walk(SERVER, path => path.endsWith('McpTools.java'))
  .flatMap(file => [...readFileSync(file, 'utf8').matchAll(/new McpTool\(\s*"([a-z_]+)"/g)].map(([, name]) => name)));
const table = readFileSync(join(SKILL, 'references', 'tools.md'), 'utf8').split('\n')
  .filter(line => line.startsWith('| `'))
  .flatMap(line => [...line.split('|')[1].matchAll(/`([a-z_]+)`/g)].map(([, name]) => name));
const documented = new Set(table);
for (const name of registered) if (!documented.has(name)) problems.push(`references/tools.md: server tool ${name} is missing`);
for (const name of documented) if (!registered.has(name)) problems.push(`references/tools.md: ${name} is not a tool the server registers`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`better-issue-tracker: ${docs.length} files, ${linked.size} links, ${registered.size} MCP tools match.`);
