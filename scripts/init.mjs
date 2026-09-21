/**
 * The spin-up resolver. Writes a new package OUT OF TREE from an explicit allowlist of
 * product paths; the template checkout is never modified, so this is re-runnable and
 * works equally for a new repo and for a subdirectory of an existing one.
 *
 *   node scripts/init.mjs --name=<pkg> --repo=<url> --out=<dir> [--source=ts|js] [--cli]
 *                         [--author=<text>] [--description=<text>]
 *
 * --name, --repo and --out are required: a placeholder name or a guessed repository owner
 * in a published package is the silent-wrong-value failure the house rule forbids, so the
 * resolver refuses rather than defaults. --source defaults to `ts` (constitution v1.1.0,
 * Principle V); `js` is the explicit opt-out.
 *
 * Only ALLOWLIST crosses. Everything the template uses to develop itself — specs/, the
 * Spec Kit install, this script and its tests, SPIN-UP.md, the template README — is
 * apparatus and is excluded by construction, not by enumeration.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEMPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@snackbyte';
const PLACEHOLDER = 'PACKAGE_NAME';
const MODES = /** @type {const} */ (['ts', 'js']);

/**
 * The product allowlist — the exact set of paths a spin-out is born with, per mode.
 * `from` is the source inside the template when it differs from `path`; `generated`
 * means the resolver writes it. `tests/machinery` asserts a spin-out's tree equals
 * `productPaths(mode, cli)`, so this table and `specs/000-.../data-model.md` must agree.
 *
 * @typedef {{ path: string, modes: readonly ('ts'|'js')[], cli?: true, from?: string, substitute?: true }} Entry
 * @type {readonly Entry[]}
 */
export const ALLOWLIST = Object.freeze([
  { path: 'package.json', modes: MODES, from: 'generated' },
  { path: 'README.md', modes: MODES, from: 'README.pkg.md', substitute: true },
  { path: 'LICENSE', modes: MODES },
  { path: '.gitignore', modes: MODES },
  { path: '.prettierrc.json', modes: MODES },
  { path: '.prettierignore', modes: MODES },
  { path: 'eslint.config.js', modes: ['ts'] },
  { path: 'eslint.config.js', modes: ['js'], from: 'variants/js/eslint.config.js' },
  { path: 'tsconfig.json', modes: ['ts'] },
  { path: 'tsconfig.json', modes: ['js'], from: 'variants/js/tsconfig.json' },
  { path: 'tsconfig.build.json', modes: ['ts'] },
  { path: 'src/index.ts', modes: ['ts'] },
  { path: 'src/index.mjs', modes: ['js'], from: 'variants/js/src/index.mjs' },
  { path: 'src/cli.ts', modes: ['ts'], cli: true },
  { path: 'src/cli.mjs', modes: ['js'], cli: true, from: 'variants/js/src/cli.mjs' },
  { path: 'tests/index.test.ts', modes: ['ts'] },
  { path: 'tests/index.test.mjs', modes: ['js'], from: 'variants/js/tests/index.test.mjs' },
]);

/**
 * The sorted list of paths a spin-out in `mode` (with or without a CLI) contains.
 * @param {'ts'|'js'} mode
 * @param {boolean} cli
 * @returns {string[]}
 */
export function productPaths(mode, cli) {
  return ALLOWLIST.filter((e) => e.modes.includes(mode) && (!e.cli || cli))
    .map((e) => e.path)
    .sort();
}

const USAGE =
  'Usage: node scripts/init.mjs --name=<pkg> --repo=<url> --out=<dir> [--source=ts|js] [--cli] [--author=<text>] [--description=<text>]';

/** @param {string} message */
function refuse(message) {
  console.error(`Error: ${message}`);
  console.error(USAGE);
  process.exit(1);
}

/**
 * Parse `--k=v` and `--flag` arguments. Unknown flags are refused: a typo like
 * `--souce=js` must not silently produce a ts package.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const known = new Set(['name', 'repo', 'out', 'source', 'cli', 'author', 'description']);
  /** @type {Record<string, string | true>} */
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) refuse(`unexpected argument "${raw}"`);
    const eq = raw.indexOf('=');
    const key = eq === -1 ? raw.slice(2) : raw.slice(2, eq);
    if (!known.has(key)) refuse(`unknown flag --${key}`);
    args[key] = eq === -1 ? true : raw.slice(eq + 1);
  }
  return args;
}

/**
 * Scope a bare name; validate npm's rules for the part we control.
 * @param {string | true | undefined} raw
 */
function resolveName(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') refuse('--name is required');
  const name = raw.trim();
  const full = name.startsWith('@') ? name : `${SCOPE}/${name}`;
  const m = /^@([a-z0-9][a-z0-9._-]*)\/([a-z0-9][a-z0-9._-]*)$/.exec(full);
  if (!m) refuse(`--name "${name}" is not a valid scoped npm package name`);
  return { full, unscoped: m[2] };
}

/**
 * Normalise a repository URL into the three metadata fields npm expects.
 * @param {string | true | undefined} raw
 */
function resolveRepo(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') refuse('--repo is required');
  let url = raw.trim().replace(/^git\+/, '');
  if (!/^https?:\/\//.test(url)) refuse(`--repo must be an http(s) URL, got "${raw}"`);
  url = url.replace(/\.git$/, '').replace(/\/+$/, '');
  return {
    repository: { type: 'git', url: `git+${url}.git` },
    homepage: `${url}#readme`,
    bugs: { url: `${url}/issues` },
  };
}

/**
 * The output directory must be absent, or an empty directory. Refused before any write.
 * @param {string | true | undefined} raw
 */
function resolveOut(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') refuse('--out is required');
  const out = resolve(raw.trim());
  // A spin-out inside the template checkout would be linted, tested and — worst —
  // committed as part of the template. Refuse it outright.
  if (out === TEMPLATE_ROOT || out.startsWith(TEMPLATE_ROOT + sep)) {
    refuse(`--out "${out}" is inside the template checkout; spin out somewhere else`);
  }
  if (existsSync(out)) {
    if (!statSync(out).isDirectory()) refuse(`--out "${out}" exists and is not a directory`);
    if (readdirSync(out).length > 0) refuse(`--out "${out}" exists and is not empty`);
  }
  return out;
}

/**
 * Resolve `SPINUP:<axis>` marker blocks in HTML-comment form: keep the block (minus the
 * markers) when `keep`, delete it otherwise.
 * @param {string} text
 * @param {string} axis
 * @param {boolean} keep
 */
function resolveMarkers(text, axis, keep) {
  const start = new RegExp(`<!-- SPINUP:${axis}:start -->\\n`, 'g');
  const end = new RegExp(`<!-- SPINUP:${axis}:end -->\\n`, 'g');
  const block = new RegExp(
    `<!-- SPINUP:${axis}:start -->\\n[\\s\\S]*?<!-- SPINUP:${axis}:end -->\\n`,
    'g',
  );
  const resolved = keep ? text.replace(start, '').replace(end, '') : text.replace(block, '');
  // Deleting a block leaves the blank lines that framed it; collapse them so the
  // spin-out's own format check opens green.
  return resolved.replace(/\n{3,}/g, '\n\n');
}

/**
 * Build the product package.json from the template's — one source of truth for the
 * publish contract, specialised per mode (see data-model.md's mode matrix).
 * @param {object} opts
 * @param {'ts'|'js'} opts.mode
 * @param {boolean} opts.cli
 * @param {{ full: string, unscoped: string }} opts.name
 * @param {ReturnType<typeof resolveRepo>} opts.repo
 * @param {string | undefined} opts.author
 * @param {string | undefined} opts.description
 */
function generatePackageJson({ mode, cli, name, repo, author, description }) {
  const template = JSON.parse(readFileSync(join(TEMPLATE_ROOT, 'package.json'), 'utf8'));
  const scripts = { ...template.scripts };
  delete scripts.init;
  const devDependencies = { ...template.devDependencies };

  /** @type {Record<string, unknown>} */
  const pkg = {
    name: name.full,
    version: '0.1.0',
    description: description ?? `${name.full} — a snackbyte package.`,
    keywords: [],
    homepage: repo.homepage,
    bugs: repo.bugs,
    repository: repo.repository,
    license: template.license,
    author: author ?? template.author,
    type: 'module',
    engines: template.engines,
  };

  if (mode === 'ts') {
    pkg.exports = template.exports;
    if (cli) pkg.bin = { [name.unscoped]: 'dist/cli.js' };
    pkg.files = ['dist/', 'README.md', 'LICENSE'];
  } else {
    pkg.exports = { '.': './src/index.mjs', './package.json': './package.json' };
    if (cli) pkg.bin = { [name.unscoped]: 'src/cli.mjs' };
    pkg.files = ['src/', 'README.md', 'LICENSE'];
    delete scripts.build;
    scripts.typecheck = 'tsc';
    scripts.prepublishOnly = 'npm run check:all';
    delete devDependencies['typescript-eslint'];
  }
  pkg.scripts = scripts;
  pkg.devDependencies = devDependencies;
  return JSON.stringify(pkg, null, 2) + '\n';
}

/** @param {string[]} argv */
function main(argv) {
  const args = parseArgs(argv);
  const name = resolveName(args.name);
  const repo = resolveRepo(args.repo);
  const out = resolveOut(args.out);
  const source = args.source ?? 'ts';
  if (source !== 'ts' && source !== 'js') refuse(`--source must be ts or js, got "${source}"`);
  const mode = /** @type {'ts'|'js'} */ (source);
  const cli = args.cli === true;
  if (args.cli !== undefined && args.cli !== true) refuse('--cli takes no value');
  const author = typeof args.author === 'string' ? args.author : undefined;
  const description = typeof args.description === 'string' ? args.description : undefined;

  // Build the whole tree in a sibling temp dir, then rename into place: a spin-out is
  // either complete or absent, never half-written. A sibling (not os.tmpdir()) so the
  // rename never crosses a filesystem.
  const parent = dirname(out);
  mkdirSync(parent, { recursive: true });
  const staging = mkdtempSync(join(parent, '.init-'));
  try {
    for (const entry of ALLOWLIST) {
      if (!entry.modes.includes(mode) || (entry.cli && !cli)) continue;
      const target = join(staging, entry.path);
      mkdirSync(dirname(target), { recursive: true });
      if (entry.from === 'generated') {
        writeFileSync(target, generatePackageJson({ mode, cli, name, repo, author, description }));
        continue;
      }
      let text = readFileSync(join(TEMPLATE_ROOT, entry.from ?? entry.path), 'utf8');
      if (entry.substitute) {
        text = resolveMarkers(text, 'cli', cli)
          .replaceAll(`${SCOPE}/${PLACEHOLDER}`, name.full)
          .replaceAll(PLACEHOLDER, name.unscoped);
      }
      writeFileSync(target, text);
    }
    if (existsSync(out)) rmSync(out, { recursive: true }); // it was verified empty above
    renameSync(staging, out);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  console.log(`Spun out ${name.full} (${mode}${cli ? ', with CLI' : ''}) into ${out}`);
  console.log('Next:');
  console.log(`  cd ${out} && npm install && npm run check:all`);
  if (mode === 'ts') console.log('  npm run build');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
