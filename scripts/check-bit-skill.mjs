#!/usr/bin/env node
// Checks BIT's own skills against this repository, so they cannot drift: the skill BIT ships
// (skills/better-issue-tracker) and the one this repository works under (.agents/skills/bit-repository-skills).
// Every relative link resolves, every playbook and reference is reachable, the frontmatter names the folder and its
// description fits, no change-log file creeps back (history lives in git and BIT work items), the shipped skill never
// brings back separate decision records (D-114), and its references/tools.md names exactly the MCP tools the server
// registers. CI runs it; exits 1 on any drift.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SERVER = join(ROOT, 'server', 'src', 'main', 'java');
const SKILLS = [
  { dir: join(ROOT, 'skills', 'better-issue-tracker'), numberedSections: true },
  { dir: join(ROOT, '.agents', 'skills', 'bit-repository-skills'), numberedSections: false },
];
const RETIRED = /\b(bit-(architecture|backend|frontend|database|api-contract|release)|verify-bit)\b/g;
const CHANGE_LOGS = /^(notes|changelog)\.md$/i;
const DECISION_RECORD = '결정기록';
const problems = [];

const walk = (dir, keep) => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path, keep) : keep(path) ? [path] : [];
});
const show = path => relative(ROOT, path).replaceAll('\\', '/');
const summary = [];

for (const { dir, numberedSections } of SKILLS) {
  const docs = walk(dir, path => path.endsWith('.md'));
  const linked = new Set();
  for (const file of docs) {
    const text = readFileSync(file, 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)#\s:]+\.md)(?:#[^)]*)?\)/g)) {
      const path = resolve(dirname(file), target);
      if (!existsSync(path)) problems.push(`${show(file)}: link to ${target} does not resolve`);
      linked.add(path);
    }
    if (numberedSections) {
      for (const [found] of text.matchAll(/\d절/g)) problems.push(`${show(file)}: "${found}" points at a numbered section; link the file instead`);
    }
    for (const [found] of text.matchAll(RETIRED)) problems.push(`${show(file)}: ${found} is now a playbook of bit-repository-skills; link it`);
  }
  for (const file of docs.filter(path => /[\\/](playbooks|references)[\\/]/.test(path))) {
    if (!linked.has(file)) problems.push(`${show(file)}: no file links to it`);
  }

  const skill = join(dir, 'SKILL.md');
  const front = readFileSync(skill, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const name = front.match(/^name: (.+)$/m)?.[1].trim();
  const description = front.match(/^description: (.+)$/m)?.[1].trim() ?? '';
  if (name !== basename(dir)) problems.push(`${show(skill)}: name is ${name}, the folder is ${basename(dir)}`);
  if (!description) problems.push(`${show(skill)}: no description`);
  if (description.length > 1024) problems.push(`${show(skill)}: description is ${description.length} characters, over 1024`);
  summary.push(`${basename(dir)}: ${docs.length} files, ${linked.size} links`);
}

for (const file of [join(ROOT, 'skills'), join(ROOT, '.agents', 'skills')]
  .flatMap(dir => walk(dir, path => CHANGE_LOGS.test(basename(path))))) {
  problems.push(`${show(file)}: change-log files are not kept; say it in the commit and the BIT work item`);
}

for (const file of walk(SKILLS[0].dir, () => true)) {
  if (readFileSync(file, 'utf8').includes(DECISION_RECORD)) {
    problems.push(`${show(file)}: ${DECISION_RECORD} is gone (D-114); a choice later work follows is a '결정' comment on its work item`);
  }
}

const registered = new Set(walk(SERVER, path => path.endsWith('McpTools.java'))
  .flatMap(file => [...readFileSync(file, 'utf8').matchAll(/new McpTool\(\s*"([a-z_]+)"/g)].map(([, name]) => name)));
const table = readFileSync(join(SKILLS[0].dir, 'references', 'tools.md'), 'utf8').split('\n')
  .filter(line => line.startsWith('| `'))
  .flatMap(line => [...line.split('|')[1].matchAll(/`([a-z_]+)`/g)].map(([, name]) => name));
const documented = new Set(table);
for (const name of registered) if (!documented.has(name)) problems.push(`references/tools.md: server tool ${name} is missing`);
for (const name of documented) if (!registered.has(name)) problems.push(`references/tools.md: ${name} is not a tool the server registers`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${summary.join('; ')}; ${registered.size} MCP tools match.`);
