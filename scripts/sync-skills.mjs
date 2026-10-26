#!/usr/bin/env node
// Copies the project skills (.agents/skills, the source) into .claude/skills for Claude Code. Claude Code's
// SessionStart hook runs it (.claude/settings.json); run it by hand after editing a skill mid-session.
// The skills BIT ships to its users (skills/, such as better-issue-tracker) are installed into .agents/skills first,
// so this repository works under them as any team would. Those copies are ignored by Git; skills/ is their source.
// `npx skills add` copies new and changed skills but leaves ones deleted from the source behind, so those are
// removed here first, going by the names the last sync recorded in skills-lock.json.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SKILLS_CLI = 'skills@1.7.2';
const root = resolve(import.meta.dirname, '..');
const source = join(root, '.agents', 'skills');
const target = join(root, '.claude', 'skills');
const lockPath = join(root, 'skills-lock.json');
const shipped = join(root, 'skills');

const skillDirs = dir => (existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && existsSync(join(dir, entry.name, 'SKILL.md')))
      .map(entry => entry.name)
  : []);
for (const name of skillDirs(shipped)) {
  rmSync(join(source, name), { recursive: true, force: true });
  cpSync(join(shipped, name), join(source, name), { recursive: true });
}

const sourceNames = skillDirs(source);
const readLock = () => (existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : { version: 1, skills: {} });

const removed = Object.keys(readLock().skills ?? {}).filter(name => !sourceNames.includes(name));
for (const name of removed) rmSync(join(target, name), { recursive: true, force: true });

if (sourceNames.length) {
  // One fixed command line through the shell, so npx resolves the same way on Windows and elsewhere.
  const result = spawnSync(`npx -y ${SKILLS_CLI} add ./.agents/skills --skill "*" -a claude-code --copy -y`, {
    cwd: root, encoding: 'utf8', shell: true,
  });
  if (result.status !== 0) {
    console.error(`skills sync failed (${result.status}): ${(result.stderr || result.stdout || '').trim().slice(-500)}`);
    process.exit(0); // A failed sync must not stop the session; the previous copies stay.
  }
}

if (removed.length) {
  const lock = readLock();
  for (const name of removed) delete lock.skills[name];
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}
console.log(`project skills synced: ${sourceNames.join(', ') || 'none'}${removed.length ? ` (removed: ${removed.join(', ')})` : ''}`);
