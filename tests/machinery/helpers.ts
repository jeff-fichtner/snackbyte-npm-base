// Shared plumbing for the machinery tests: run the resolver, run commands in a
// spin-out, list a tree. These tests are apparatus — they are not on the product
// allowlist and never reach a spin-out.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

export const TEMPLATE_ROOT = resolve(import.meta.dirname, '../..');
export const INIT = join(TEMPLATE_ROOT, 'scripts/init.mjs');

/** Two npm installs plus two check gates fit comfortably; generous so CI variance doesn't flake. */
export const SPIN_OUT_TIMEOUT_MS = 5 * 60 * 1000;

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function run(cmd: string, args: string[], cwd: string): RunResult {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: SPIN_OUT_TIMEOUT_MS });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** A fresh temp directory the test owns; call `cleanup()` when done. */
export function scratch(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'npm-base-machinery-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Run the resolver with the given flags; returns the process result. */
export function resolver(flags: string[]): RunResult {
  return run(process.execPath, [INIT, ...flags], TEMPLATE_ROOT);
}

/** Every file under `root`, as sorted paths relative to it (directories omitted). */
export function tree(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(root, full));
    }
  };
  walk(root);
  return out.sort();
}

export function npm(args: string[], cwd: string): RunResult {
  return run('npm', args, cwd);
}

/** `npm install` for a spin-out, quiet and offline-preferring. */
export function install(cwd: string): RunResult {
  return npm(['install', '--prefer-offline', '--no-audit', '--no-fund'], cwd);
}

export function exists(path: string): boolean {
  return existsSync(path);
}
