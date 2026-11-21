import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_ROOT, run, scratch } from './helpers.js';

// release.yml's look-up step: a push to main whose version is already released (tagged on
// an earlier commit of the branch, and on npm unless the package is private) must stop
// green with a notice; anything else must go on to the release-flow action, whose
// exists-guard refuses a real collision. The step's script is read out of the workflow
// itself and run in a scratch git repository, with `npm` stubbed so `npm view` answers
// without the network.

const WORKFLOW = readFileSync(join(TEMPLATE_ROOT, '.github/workflows/release.yml'), 'utf8');

/** The `run: |` body of the step whose `id:` is `id`, de-indented. */
function stepScript(id: string): string {
  const lines = WORKFLOW.split('\n');
  const at = lines.findIndex((l) => l.trim() === `- id: ${id}`);
  if (at === -1) throw new Error(`no step "${id}" in release.yml`);
  const runAt = lines.findIndex((l, i) => i > at && l.trim() === 'run: |');
  const indent = (lines[runAt + 1] ?? '').search(/\S/);
  const body: string[] = [];
  for (const line of lines.slice(runAt + 1)) {
    if (line.trim() !== '' && line.search(/\S/) < indent) break;
    body.push(line.slice(indent));
  }
  return body.join('\n');
}

let s: ReturnType<typeof scratch>;
let repo: string;
let bin: string;

function git(...args: string[]) {
  const r = run('git', args, repo);
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
}

function commit(version: string, priv: boolean, message: string) {
  const pkg: Record<string, unknown> = { name: '@snackbyte/demo', version };
  if (priv) pkg.private = true;
  writeFileSync(join(repo, 'package.json'), JSON.stringify(pkg));
  writeFileSync(join(repo, 'change.txt'), message);
  git('add', '-A');
  git('commit', '-q', '-m', message);
}

/** Run the look-up with `npm view` answering `onNpm` (empty: not published). */
function lookup(onNpm: string): { outputs: string; stdout: string } {
  const output = join(s.dir, 'github-output');
  writeFileSync(output, '');
  const r = run(
    'bash',
    [
      '-c',
      `set -euo pipefail\nexport PATH="${bin}:$PATH" GITHUB_OUTPUT="${output}" ON_NPM="${onNpm}"\n${stepScript('pkg')}`,
    ],
    repo,
  );
  expect(r.status, r.stderr).toBe(0);
  return { outputs: readFileSync(output, 'utf8'), stdout: r.stdout };
}

beforeEach(() => {
  s = scratch();
  repo = join(s.dir, 'repo');
  bin = join(s.dir, 'bin');
  mkdirSync(repo);
  mkdirSync(bin);
  // `npm view <name>@<version> version` prints $ON_NPM, or nothing (404) when it is empty
  writeFileSync(
    join(bin, 'npm'),
    '#!/usr/bin/env bash\n[ "$1" = view ] || exit 2\n[ -n "$ON_NPM" ] || exit 1\necho "$ON_NPM"\n',
  );
  chmodSync(join(bin, 'npm'), 0o755);
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
});
afterEach(() => s.cleanup());

describe('release.yml look-up: is this push already released?', () => {
  it('reads the step out of the workflow', () => {
    expect(stepScript('pkg')).toContain('merge-base --is-ancestor');
  });

  it('a private package, version tagged on an earlier commit: released, with a notice', () => {
    commit('0.7.0', true, 'release 0.7.0');
    git('tag', 'v0.7.0');
    commit('0.7.0', true, 'docs only');
    const { outputs, stdout } = lookup('');
    expect(outputs).toContain('private=true');
    expect(outputs).toContain('released=true');
    expect(stdout).toContain('::notice::@snackbyte/demo@0.7.0 is already released as v0.7.0');
  });

  it('a bumped version with no tag: goes on to the release', () => {
    commit('0.7.0', true, 'release 0.7.0');
    git('tag', 'v0.7.0');
    commit('0.8.0', true, 'release 0.8.0');
    expect(lookup('').outputs).not.toContain('released=');
  });

  it('a tag on a commit outside this branch: goes on, so the Action refuses the collision', () => {
    commit('0.7.0', true, 'base');
    git('switch', '-q', '-c', 'elsewhere');
    commit('0.8.0', true, 'tagged elsewhere');
    git('tag', 'v0.8.0');
    git('switch', '-q', 'main');
    commit('0.8.0', true, 'same version on main');
    expect(lookup('').outputs).not.toContain('released=');
  });

  it('a public package, tagged and on npm: released', () => {
    commit('1.2.0', false, 'release 1.2.0');
    git('tag', 'v1.2.0');
    commit('1.2.0', false, 'chore');
    const { outputs } = lookup('1.2.0');
    expect(outputs).toContain('private=false');
    expect(outputs).toContain('released=true');
  });

  it('a public package, tagged but never on npm: goes on, so the Action fails loudly', () => {
    commit('1.2.0', false, 'release 1.2.0');
    git('tag', 'v1.2.0');
    commit('1.2.0', false, 'chore');
    expect(lookup('').outputs).not.toContain('released=');
  });
});
