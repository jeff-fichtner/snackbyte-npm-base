# Data model: Phase 0 — The template exists

There is no runtime data. The "entities" are the two tables the resolver owns and the
machinery tests assert against. Both live in `scripts/init.mjs` as the single source of
truth; this file is their readable form and must be kept in step by the test that
compares a spin-out's tree to the allowlist.

## The product allowlist

Exactly what a spin-out is born with. Anything not here never crosses.

| Path | `ts` | `js` | Source in the template | Substitution |
|---|---|---|---|---|
| `package.json` | ✔ | ✔ | generated from the template's (see mode matrix) | name, description, repository, homepage, bugs, author, version → `0.1.0` |
| `README.md` | ✔ | ✔ | `README.pkg.md` | `PACKAGE_NAME` → unscoped name; `@snackbyte/PACKAGE_NAME` → full name |
| `LICENSE` | ✔ | ✔ | `LICENSE` | none (author already the fleet constant) |
| `.gitignore` | ✔ | ✔ | `.gitignore` | none |
| `.prettierrc.json` | ✔ | ✔ | `.prettierrc.json` | none |
| `.prettierignore` | ✔ | ✔ | `.prettierignore` | none |
| `eslint.config.js` | ✔ | ✔ | root / `variants/js/eslint.config.js` | none |
| `tsconfig.json` | ✔ | ✔ | root / `variants/js/tsconfig.json` | none |
| `tsconfig.build.json` | ✔ | — | root | none |
| `src/index.ts` | ✔ | — | root | none |
| `src/index.mjs` | — | ✔ | `variants/js/src/index.mjs` | none |
| `src/cli.ts` | `--cli` | — | root | none |
| `src/cli.mjs` | — | `--cli` | `variants/js/src/cli.mjs` | none |
| `tests/index.test.ts` | ✔ | — | root | none |
| `tests/index.test.mjs` | — | ✔ | `variants/js/tests/index.test.mjs` | none |

Phase 1 extended this table (both modes) with `scripts/check-publish-contract.mjs`,
`scripts/smoke-pack.mjs`, `scripts/smoke-registry.mjs`, `.github/workflows/release.yml`,
`.github/workflows/ci.yml`, `environments.json`, `RELEASING.md` and `CLAUDE.md` (from
`CLAUDE.pkg.md`, substituted) — see `specs/001-phase-1-ship-one-package/data-model.md`.

## The mode matrix (what differs in the generated `package.json`)

| Field | `ts` | `js` |
|---|---|---|
| `exports["."]` | `{ "types": "./dist/index.d.ts", "import": "./dist/index.js" }` | `"./src/index.mjs"` |
| `exports["./package.json"]` | `"./package.json"` | `"./package.json"` |
| `files` | `["dist/", "README.md", "LICENSE"]` | `["src/", "README.md", "LICENSE"]` |
| `bin` (with `--cli`) | `{ "<unscoped>": "dist/cli.js" }` | `{ "<unscoped>": "src/cli.mjs" }` |
| `scripts.build` | `tsc -p tsconfig.build.json` | (absent) |
| `scripts.typecheck` | `tsc --noEmit` | `tsc` (noEmit is in the js tsconfig) |
| `scripts.prepublishOnly` | `npm run build && npm run check:all` | `npm run check:all` |
| `scripts.check:all` | `format:check && lint && typecheck && test` | same |
| devDependencies | full set | full set minus `typescript-eslint` |

Shared in both: `type: "module"`, `engines.node: ">=24"`, `license: "MIT"`, `version:
"0.1.0"`, `description`, `keywords: []`, `repository`, `homepage`, `bugs`, `author`,
`scripts.lint/format/format:check/test`.

## Resolver arguments

| Flag | Required | Values | Default |
|---|---|---|---|
| `--name` | yes | bare (`auth-client`) or scoped (`@snackbyte/auth-client`) | — (bare is scoped to `@snackbyte/`) |
| `--repo` | yes | a git/GitHub URL | — |
| `--out` | yes | a path that does not exist or is an empty directory | — |
| `--source` | no | `ts` \| `js` | `ts` |
| `--cli` | no | flag | off |
| `--author` | no | text | template `package.json` `author` |
| `--description` | no | text | `"<name> — a snackbyte package."` |

State: the resolver has none. It reads the template checkout and writes `--out` once;
any refusal happens before the first byte is written.
